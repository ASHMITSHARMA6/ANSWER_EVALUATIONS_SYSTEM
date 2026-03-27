/**
 * OCR Service — Hybrid: Groq Vision AI (Primary) + Tesseract.js (Fallback)
 *
 * Primary: Groq Vision API (Llama 4 Scout) — FREE tier
 *   - Excellent handwriting recognition (AI vision model)
 *   - Fast (~2s per image)
 *   - Free tier: generous daily limits
 *   - Requires internet + GROQ_API_KEY
 *
 * Fallback: Tesseract.js (local, offline)
 *   - Works without internet
 *   - Multi-strategy preprocessing for best results
 *   - Used when Groq is unavailable or quota exceeded
 *
 * Supports: JPG, PNG, GIF, BMP, PDF
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fetch = require('node-fetch');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Vision models have image size limits; we resize large images before sending
const MAX_IMAGE_DIMENSION = 2048;   // pixels
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB base64 ≈ 3MB image

const OCR_PROMPT = `You are an expert handwriting transcription assistant. Read and transcribe ALL the handwritten text in this image exactly as written.

Rules:
- Transcribe every word, sentence, and paragraph faithfully
- Preserve the original structure (paragraphs, line breaks, numbered lists)
- Do NOT add any commentary, headings, or formatting markers like **bold** or bullet points
- Do NOT summarize or interpret the content
- If a word is unclear, make your best guess based on context
- If a word is completely unreadable, write [unclear]
- Output ONLY the transcribed text, nothing else`;

// ═══════════════════════════════════════════════════════════════════
// GROQ VISION (PRIMARY ENGINE)
// ═══════════════════════════════════════════════════════════════════

/**
 * Prepare an image for the vision API: resize if too large, convert to JPEG
 */
async function prepareImageForVision(filePath) {
  const metadata = await sharp(filePath).metadata();
  let pipeline = sharp(filePath);

  // Resize if any dimension exceeds limit
  if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
    pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to JPEG for smaller size
  const buffer = await pipeline.jpeg({ quality: 85 }).toBuffer();

  // If still too large, reduce quality
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    const smallerBuffer = await sharp(buffer)
      .jpeg({ quality: 60 })
      .toBuffer();
    return { buffer: smallerBuffer, mimeType: 'image/jpeg' };
  }

  return { buffer, mimeType: 'image/jpeg' };
}

/**
 * Extract text from an image using Groq Vision API
 */
async function extractWithGroqVision(filePath) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  console.log('[OCR] Using Groq Vision AI (Llama 4 Scout)...');

  const { buffer, mimeType } = await prepareImageForVision(filePath);
  const base64Image = buffer.toString('base64');
  console.log('[OCR] Image prepared: ' + (buffer.length / 1024).toFixed(0) + 'KB');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GROQ_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: 'data:' + mimeType + ';base64,' + base64Image,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error('Groq API HTTP ' + response.status + ': ' + errBody);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error('Groq API error: ' + (data.error.message || JSON.stringify(data.error)));
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Groq API returned unexpected response format');
  }

  const text = data.choices[0].message.content.trim();
  console.log('[OCR] Groq Vision extracted ' + text.length + ' characters');
  return text;
}

// ═══════════════════════════════════════════════════════════════════
// TESSERACT.JS (FALLBACK ENGINE)
// ═══════════════════════════════════════════════════════════════════

// ── Worker Pool ──────────────────────────────────────────────────────────────
let _worker = null;
let _workerReady = false;

async function getWorker() {
  if (_worker && _workerReady) return _worker;

  console.log('[OCR] Initializing Tesseract.js worker...');
  _worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(m.progress * 100);
        if (pct % 50 === 0) process.stdout.write('[OCR] ' + pct + '% ');
      }
    },
  });

  // LSTM-only engine (OEM 1) is much better for handwriting than legacy
  await _worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    preserve_interword_spaces: '1',
    // Allow all printable ASCII + common punctuation
    tessedit_char_whitelist: '',
  });

  _workerReady = true;
  console.log('[OCR] Worker ready (LSTM engine)');
  return _worker;
}

// ── Upscale helper ───────────────────────────────────────────────────────────
// Tesseract needs ~300 DPI; most phone photos are ~96 DPI.
// We upscale so the shortest dimension is at least 2000px.
async function ensureMinResolution(pipeline, metadata) {
  const TARGET = 2000;
  const shortest = Math.min(metadata.width, metadata.height);
  if (shortest < TARGET) {
    const scale = Math.min(4, TARGET / shortest); // cap at 4×
    const w = Math.round(metadata.width * scale);
    const h = Math.round(metadata.height * scale);
    pipeline = pipeline.resize(w, h, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });
    console.log('[OCR]   ↳ upscaled ' + scale.toFixed(1) + '× → ' + w + '×' + h);
  }
  return pipeline;
}

// ── Preprocessing Strategies ─────────────────────────────────────────────────
// Each returns a Sharp pipeline ready for .toFile()

const strategies = {
  // Strategy 1: Gentle — preserves light / thin strokes
  gentle: async (filePath) => {
    const meta = await sharp(filePath).metadata();
    let p = sharp(filePath);
    p = await ensureMinResolution(p, meta);
    p = p.grayscale()
      .linear(1.15, 0)          // very mild contrast boost
      .sharpen({ sigma: 0.8 })  // light sharpen
      .normalise();              // auto stretch histogram (like adaptive threshold)
    return p;
  },

  // Strategy 2: Standard — good default for most handwriting
  standard: async (filePath) => {
    const meta = await sharp(filePath).metadata();
    let p = sharp(filePath);
    p = await ensureMinResolution(p, meta);
    p = p.grayscale()
      .linear(1.4, -20)         // moderate contrast
      .sharpen({ sigma: 1.0 })
      .threshold(128);           // moderate binarisation
    return p;
  },

  // Strategy 3: Aggressive — for faint / light ink on textured paper
  aggressive: async (filePath) => {
    const meta = await sharp(filePath).metadata();
    let p = sharp(filePath);
    p = await ensureMinResolution(p, meta);
    p = p.grayscale()
      .linear(2.0, -60)         // heavy contrast boost
      .sharpen({ sigma: 1.5, m1: 2, m2: 3 })
      .threshold(100)            // lower threshold → keeps more ink
      .median(3);                // remove speckle noise
    return p;
  },

  // Strategy 4: Adaptive — let Sharp's normalise() do automatic contrast
  adaptive: async (filePath) => {
    const meta = await sharp(filePath).metadata();
    let p = sharp(filePath);
    p = await ensureMinResolution(p, meta);
    p = p.grayscale()
      .normalise()               // auto-contrast / adaptive histogram
      .sharpen({ sigma: 1.0 })
      .threshold(0, { greyscale: false }); // Otsu auto-threshold (0 = auto in sharp)
    return p;
  },

  // Strategy 5: Raw — only upscale, no other processing
  raw: async (filePath) => {
    const meta = await sharp(filePath).metadata();
    let p = sharp(filePath);
    p = await ensureMinResolution(p, meta);
    p = p.grayscale();
    return p;
  },

  // Strategy 6: Negate — for dark backgrounds / inverted images
  negate: async (filePath) => {
    const meta = await sharp(filePath).metadata();
    let p = sharp(filePath);
    p = await ensureMinResolution(p, meta);
    p = p.grayscale()
      .negate()
      .normalise()
      .sharpen({ sigma: 1.0 });
    return p;
  },
};

// PSM modes to try with the best preprocessing result
const PSM_MODES = [
  { name: 'SINGLE_BLOCK', value: Tesseract.PSM.SINGLE_BLOCK },
  { name: 'AUTO',         value: Tesseract.PSM.AUTO },
  { name: 'SPARSE_TEXT',  value: Tesseract.PSM.SPARSE_TEXT },
];

// ── Score a recognition result ───────────────────────────────────────────────
// Higher is better. We weigh confidence heavily but also reward longer text
// (a 90% confidence result with 200 chars is better than 95% with 3 chars).
function scoreResult(text, confidence) {
  const len = text.trim().length;
  if (len === 0) return 0;
  // Bonus for having actual words (not just random chars)
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 1).length;
  const wordBonus = Math.min(wordCount * 2, 30);
  return (confidence * 0.7) + (Math.min(len, 500) * 0.06) + wordBonus;
}

// ── Core: Extract text from image ────────────────────────────────────────────
// Tries Groq Vision first (accurate), falls back to Tesseract (offline)

async function extractTextFromImage(filePath) {
  console.log('[OCR] Processing: ' + path.basename(filePath));

  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }

  // ── Try Groq Vision first (much better for handwriting) ──
  if (GROQ_API_KEY) {
    try {
      const text = await extractWithGroqVision(filePath);
      if (text && text.trim().length > 5) {
        return text.trim();
      }
      console.log('[OCR] Groq Vision returned empty/short result, falling back to Tesseract...');
    } catch (err) {
      console.log('[OCR] Groq Vision failed: ' + err.message);
      console.log('[OCR] Falling back to Tesseract.js (local OCR)...');
    }
  } else {
    console.log('[OCR] No GROQ_API_KEY configured, using Tesseract.js...');
  }

  // ── Fallback: Tesseract.js multi-strategy ──
  return extractWithTesseract(filePath);
}

/**
 * Tesseract.js multi-strategy extraction (fallback engine)
 */
async function extractWithTesseract(filePath) {
  const tempFiles = [];

  try {
    console.log('[OCR] Processing: ' + path.basename(filePath));

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }

    const worker = await getWorker();

    // ── Phase 1: Run all preprocessing strategies IN PARALLEL ──
    const strategyNames = Object.keys(strategies);
    const preprocessed = {}; // { strategyName: filePath }

    console.log('[OCR] Running ' + strategyNames.length + ' preprocessing strategies in parallel...');

    const preprocessJobs = strategyNames.map(async (name) => {
      const outPath = filePath.replace(/(\.\w+)$/, '_ocr_' + name + '.png');
      try {
        const pipeline = await strategies[name](filePath);
        await pipeline.png().toFile(outPath);
        tempFiles.push(outPath);
        return { name, path: outPath };
      } catch (err) {
        console.log('[OCR]   ↳ ' + name + ' failed: ' + err.message);
        return null;
      }
    });

    const results = await Promise.all(preprocessJobs);
    for (const r of results) {
      if (r) preprocessed[r.name] = r.path;
    }

    // Also try the original file as-is
    preprocessed['original'] = filePath;

    // ── Phase 2: OCR each preprocessed image (early-exit if confidence ≥ 85%) ──
    let bestText = '';
    let bestScore = 0;
    let bestStrategy = '';
    let bestConf = 0;

    // Try the 3 most likely strategies first (gentle, adaptive, raw)
    const priorityOrder = ['gentle', 'adaptive', 'raw', 'standard', 'aggressive', 'negate', 'original'];
    const orderedEntries = priorityOrder
      .filter(n => preprocessed[n])
      .map(n => [n, preprocessed[n]]);
    // Add any remaining not in priority list
    for (const [n, p] of Object.entries(preprocessed)) {
      if (!priorityOrder.includes(n)) orderedEntries.push([n, p]);
    }

    for (const [name, imgPath] of orderedEntries) {
      try {
        const { data } = await worker.recognize(imgPath);
        const text = data.text.trim();
        const conf = data.confidence;
        const s = scoreResult(text, conf);

        console.log('[OCR]   ' + name.padEnd(12) + ' → ' +
          text.length + ' chars, conf=' + conf + '%, score=' + s.toFixed(1));

        if (s > bestScore) {
          bestScore = s;
          bestText = text;
          bestStrategy = name;
          bestConf = conf;
        }

        // Early exit: if confidence is high and we have substantial text, no need to try more
        if (bestConf >= 85 && bestText.length >= 20) {
          console.log('[OCR]   ↳ High confidence early exit after "' + bestStrategy + '"');
          break;
        }
      } catch (err) {
        console.log('[OCR]   ' + name + ' OCR failed: ' + err.message);
      }
    }

    // ── Phase 3: If best result is still poor, try different PSM modes ──
    if (bestConf < 50 || bestText.length < 15) {
      console.log('[OCR] Low initial result (conf=' + bestConf + '%), trying alternate PSM modes...');

      // Use the top 2 strategy images for PSM experiments
      const topImages = Object.entries(preprocessed)
        .filter(([n]) => n !== 'original')
        .slice(0, 3);

      for (const psmMode of PSM_MODES) {
        if (psmMode.value === Tesseract.PSM.SINGLE_BLOCK) continue; // already tried

        await worker.setParameters({
          tessedit_pageseg_mode: psmMode.value,
        });

        for (const [name, imgPath] of topImages) {
          try {
            const { data } = await worker.recognize(imgPath);
            const text = data.text.trim();
            const conf = data.confidence;
            const s = scoreResult(text, conf);

            console.log('[OCR]   ' + name + '+' + psmMode.name +
              ' → ' + text.length + ' chars, conf=' + conf + '%, score=' + s.toFixed(1));

            if (s > bestScore) {
              bestScore = s;
              bestText = text;
              bestStrategy = name + '+' + psmMode.name;
              bestConf = conf;
            }
          } catch (err) { /* skip */ }
        }
      }

      // Reset to default PSM
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });
    }

    console.log('[OCR] ✓ Best: strategy="' + bestStrategy + '", ' +
      bestText.length + ' chars, confidence=' + bestConf + '%');

    return bestText;

  } catch (error) {
    console.error('[OCR] Error: ' + error.message);
    throw error;
  } finally {
    // Cleanup temp files
    for (const f of tempFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { /* ignore */ }
    }
  }
}

/**
 * Extract text from a PDF file
 * Converts PDF pages to images, then OCRs each page
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} - Extracted text from all pages
 */
async function extractTextFromPDF(filePath) {
  const tempFiles = [];

  try {
    console.log('[OCR] Processing PDF: ' + path.basename(filePath));

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }

    // First try: extract text directly from PDF (for text-based PDFs)
    try {
      const pdfParse = require('pdf-parse');
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);

      if (pdfData.text && pdfData.text.trim().length > 50) {
        const rawText = pdfData.text.trim();

        // Quality check: scanned PDFs often have a garbage OCR text layer.
        // We check for common English words — real text will contain many of these.
        const commonWords = new Set([
          'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
          'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
          'this', 'but', 'his', 'by', 'from', 'they', 'we', 'her', 'she',
          'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
          'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
          'go', 'me', 'when', 'make', 'can', 'like', 'no', 'just', 'him',
          'know', 'take', 'come', 'could', 'than', 'look', 'use', 'find',
          'here', 'thing', 'many', 'well', 'also', 'after', 'how', 'our',
          'work', 'any', 'day', 'most', 'new', 'want', 'give', 'more',
          'some', 'time', 'very', 'your', 'are', 'is', 'was', 'were', 'been',
          'has', 'had', 'did', 'does', 'may', 'might', 'must', 'shall',
          'should', 'need', 'used', 'each', 'every', 'both', 'few', 'own',
          'other', 'such', 'only', 'then', 'first', 'now', 'way', 'into',
          'over', 'because', 'between', 'through', 'before', 'where', 'same',
          'data', 'model', 'based', 'system', 'using', 'process', 'these',
          'answer', 'question', 'student', 'test', 'exam', 'write', 'read',
        ]);

        const words = rawText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const totalWords = words.length;
        const knownWords = words.filter(w => commonWords.has(w.replace(/[^a-z]/g, ''))).length;
        const knownRatio = totalWords > 0 ? knownWords / totalWords : 0;

        console.log('[OCR] PDF embedded text: ' + rawText.length + ' chars, ' +
          totalWords + ' words, ' + knownWords + ' common English words (' +
          (knownRatio * 100).toFixed(0) + '%)');

        // Real English text typically has ≥20% common words
        if (knownRatio >= 0.20 && totalWords >= 10) {
          console.log('[OCR] ✓ Embedded text looks like real language, using it');
          return rawText;
        }
        console.log('[OCR] ✗ Embedded text looks garbled (scanned PDF), falling through to image OCR...');
      } else {
        console.log('[OCR] PDF has no/little embedded text, using OCR on pages...');
      }
    } catch (pdfErr) {
      console.log('[OCR] PDF text extraction failed, using OCR on pages...');
    }

    // Convert PDF pages to images using pdftoppm
    const { execSync } = require('child_process');
    const tmpDir = path.join(path.dirname(filePath), 'pdf_tmp_' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    tempFiles.push(tmpDir);

    try {
      execSync('pdftoppm -jpeg -r 300 "' + filePath + '" "' + path.join(tmpDir, 'page') + '"', {
        timeout: 60000,
      });
    } catch (convErr) {
      throw new Error(
        'Failed to convert PDF to images. Install poppler-utils:\n' +
        '  Ubuntu/Debian: sudo apt install poppler-utils\n' +
        '  Fedora: sudo dnf install poppler-utils\n' +
        '  macOS: brew install poppler\n' +
        'Error: ' + convErr.message
      );
    }

    const pageFiles = fs.readdirSync(tmpDir)
      .filter(function(f) { return f.startsWith('page') && /\.(jpg|jpeg|ppm|png)$/i.test(f); })
      .sort()
      .map(function(f) { return path.join(tmpDir, f); });

    if (pageFiles.length === 0) {
      throw new Error('PDF conversion produced no page images');
    }

    console.log('[OCR] Converted PDF to ' + pageFiles.length + ' page image(s)');

    const allText = [];
    for (let i = 0; i < pageFiles.length; i++) {
      console.log('[OCR] Processing page ' + (i + 1) + '/' + pageFiles.length);
      try {
        const pageText = await extractTextFromImage(pageFiles[i]);
        if (pageText.trim()) {
          allText.push(pageText.trim());
        }
      } catch (pageErr) {
        console.error('[OCR] Page ' + (i + 1) + ' failed: ' + pageErr.message);
        allText.push('[Page ' + (i + 1) + ': OCR failed]');
      }
    }

    const fullText = allText.join('\n\n--- Page Break ---\n\n').trim();
    console.log('[OCR] PDF extracted ' + fullText.length + ' characters from ' + pageFiles.length + ' pages');
    return fullText;

  } catch (error) {
    console.error('[OCR] PDF Error: ' + error.message);
    throw error;
  } finally {
    for (let t = 0; t < tempFiles.length; t++) {
      try {
        var tmp = tempFiles[t];
        if (fs.existsSync(tmp) && fs.statSync(tmp).isDirectory()) {
          fs.rmSync(tmp, { recursive: true, force: true });
        } else if (fs.existsSync(tmp)) {
          fs.unlinkSync(tmp);
        }
      } catch (e) { /* ignore cleanup errors */ }
    }
  }
}

/**
 * Extract text from a file (auto-detect format)
 * @param {string} filePath - Path to image or PDF file
 * @returns {Promise<string>} - Extracted text
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return extractTextFromPDF(filePath);
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].indexOf(ext) !== -1) {
    return extractTextFromImage(filePath);
  } else {
    throw new Error('Unsupported file format: ' + ext);
  }
}

/**
 * Extract text from multiple files
 * @param {string[]} filePaths - Array of file paths
 * @returns {Promise<Object[]>} - Array of extraction results
 */
async function extractTextFromMultipleFiles(filePaths) {
  console.log('[OCR] Processing ' + filePaths.length + ' files...');

  const results = [];
  for (let i = 0; i < filePaths.length; i++) {
    try {
      const text = await extractText(filePaths[i]);
      results.push({ filePath: filePaths[i], text: text, success: true });
    } catch (error) {
      console.error('[OCR] Failed to process ' + filePaths[i] + ': ' + error.message);
      results.push({ filePath: filePaths[i], text: '', success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Cleanup: terminate the Tesseract worker (call on server shutdown)
 */
async function cleanup() {
  if (_worker) {
    await _worker.terminate();
    _worker = null;
    _workerReady = false;
    console.log('[OCR] Tesseract worker terminated');
  }
}

module.exports = {
  extractTextFromImage: extractTextFromImage,
  extractTextFromPDF: extractTextFromPDF,
  extractText: extractText,
  extractTextFromMultipleFiles: extractTextFromMultipleFiles,
  cleanup: cleanup,
};
