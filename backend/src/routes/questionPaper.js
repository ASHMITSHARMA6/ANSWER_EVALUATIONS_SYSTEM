const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const os = require('os');
const auth = require('../middleware/auth');
const StudyMaterial = require('../models/StudyMaterial');
const QuestionSet = require('../models/QuestionSet');
const ModelAnswer = require('../models/ModelAnswer');
const CanonicalMaterial = require('../models/CanonicalMaterial');
const vectorDbService = require('../services/vectorDbService');
const embeddingService = require('../services/embeddingService');
const { callGroqAPI, generateModelAnswersWithRetrieval } = require('../services/aiService');
const ocrService = require('../services/ocrService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
}).single('file');

function maybeMulter(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return upload(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'File upload failed' });
      next();
    });
  }
  next();
}

const EXTRACT_QUESTIONS_SYSTEM = `You extract exam questions from a question paper.

CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON array of question strings.
2. Keep each question as a clean, standalone sentence or paragraph.
3. Preserve numbering inside the question text if present.
4. Do NOT add extra commentary or text outside the JSON array.`;

function extractQuestionsHeuristic(rawText) {
  const text = String(rawText || '').replace(/\r/g, '\n');
  const rawLines = text.split('\n');
  const lines = rawLines.map((line) => line.trim()).filter(Boolean);

  const questionStarts = /^\s*(?:q(?:uestion)?\s*)?(\d{1,3})[\).:\-]/i;
  const verbStart = /^(?:Explain|Describe|Discuss|Compare|Differentiate|Define|What|Why|How|Analyze|Evaluate|List|Write|State)\b/i;
  const marksSuffix = /(\(\d+\s*marks?\)|\[\d+\s*marks?\]|\(\d+\))/i;
  const questions = [];
  let current = '';

  const pushCurrent = () => {
    if (current) {
      questions.push(current.trim());
      current = '';
    }
  };

  lines.forEach((line) => {
    if (questionStarts.test(line)) {
      pushCurrent();
      current = line.replace(/\s{2,}/g, ' ');
      return;
    }

    if (!current && (line.endsWith('?') || verbStart.test(line) || marksSuffix.test(line))) {
      current = line.replace(/\s{2,}/g, ' ');
      return;
    }

    if (current) {
      current = `${current} ${line}`.trim();
    } else if (line.endsWith('?')) {
      questions.push(line);
    }
  });

  pushCurrent();

  const byBlankLine = text
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter((block) => block.length > 10 && (verbStart.test(block) || block.endsWith('?')));

  return [...questions, ...byBlankLine]
    .map((q) => q.replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean);
}

async function extractQuestions(rawText) {
  const heuristic = extractQuestionsHeuristic(rawText);
  if (heuristic.length >= 2) {
    return { questions: heuristic, method: 'heuristic' };
  }

  const aiResponse = await callGroqAPI(
    EXTRACT_QUESTIONS_SYSTEM,
    `QUESTION PAPER TEXT:\n${rawText}\n\nReturn ONLY a JSON array of questions.`,
    0.2
  );

  if (!aiResponse) {
    return { questions: heuristic, method: 'heuristic' };
  }

  try {
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error('Parsed data is not an array');
    const cleaned = parsed.map((q) => String(q || '').trim()).filter(Boolean);
    return { questions: cleaned, method: 'ai' };
  } catch (err) {
    return { questions: heuristic, method: 'heuristic' };
  }
}

async function getMaterialContent(material) {
  if (!material) return '';
  if (material.content) return material.content;
  if (material.canonicalMaterialId) {
    const canonical = await CanonicalMaterial.findById(material.canonicalMaterialId).lean();
    return canonical?.content || '';
  }
  return '';
}

async function extractPdfTextWithFallback(fileBuffer, originalName) {
  let parsedText = '';
  try {
    const data = await pdfParse(fileBuffer);
    parsedText = (data && data.text) ? String(data.text).trim() : '';
  } catch (err) {
    parsedText = '';
  }

  if (parsedText) {
    return { text: parsedText, source: 'pdf-parse' };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'question-paper-'));
  const tmpPath = path.join(tmpDir, originalName || `paper-${Date.now()}.pdf`);
  fs.writeFileSync(tmpPath, fileBuffer);

  try {
    const ocrText = await ocrService.extractText(tmpPath);
    return { text: String(ocrText || '').trim(), source: 'ocr' };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      // ignore cleanup errors
    }
  }
}

router.post('/', auth, maybeMulter, async (req, res) => {
  try {
    const { testId, questionPaper, maxMarks } = req.body || {};
    if (!testId) {
      return res.status(400).json({ error: 'Select a test before uploading a question paper.' });
    }

    let paperText = '';
    if (req.file) {
      try {
        const extracted = await extractPdfTextWithFallback(req.file.buffer, req.file.originalname);
        paperText = extracted.text;
        if (!paperText) {
          return res.status(400).json({
            error: 'No text found in the PDF. Please use a text-based PDF or paste the questions directly.'
          });
        }
        console.log('[Question Paper] PDF extracted via:', extracted.source);
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Could not extract text from PDF.' });
      }
    } else if (typeof questionPaper === 'string') {
      paperText = questionPaper.trim();
    }

    if (!paperText) {
      console.warn('[Question Paper] Missing file/text:', {
        contentType: req.headers['content-type'],
        hasFile: Boolean(req.file),
        bodyKeys: Object.keys(req.body || {})
      });
      return res.status(400).json({ error: 'Provide question paper text or upload a PDF.' });
    }

    const { questions, method } = await extractQuestions(paperText);
    if (!questions || questions.length === 0) {
      return res.status(400).json({
        error: 'No questions detected in the question paper. Try a text-based PDF or paste the questions directly.'
      });
    }

    const limitedQuestions = questions.slice(0, 30);

    const material = await StudyMaterial.findOne({ teacherId: req.user._id, testId })
      .sort({ createdAt: -1 })
      .lean();

    const materialContent = await getMaterialContent(material);
    if (!materialContent) {
      return res.status(400).json({
        error: 'Upload or reference study material before generating model answers.'
      });
    }

    const chunkPool = [];
    for (const question of limitedQuestions) {
      const queryEmbedding = await embeddingService.generateEmbedding(question);
      const matches = vectorDbService.queryMaterial(queryEmbedding, 8, testId);
      chunkPool.push(...matches);
    }

    const uniqueChunks = Array.from(
      new Map(chunkPool.map((chunk) => [chunk.text, chunk])).values()
    ).slice(0, 30);

    if (uniqueChunks.length === 0) {
      uniqueChunks.push({ text: materialContent.substring(0, 2000), source: material?._id, section: 'raw_material' });
    }

    if (paperText && paperText.length > 0) {
      uniqueChunks.unshift({
        text: paperText.substring(0, 2000),
        source: 'question_paper',
        section: 'question_paper'
      });
    }

    const answerResult = await generateModelAnswersWithRetrieval(limitedQuestions, uniqueChunks);
    if (answerResult.error) {
      return res.status(502).json({ error: answerResult.error });
    }

    const modelAnswers = answerResult.modelAnswers || [];
    const questionPairs = limitedQuestions.map((question, index) => ({
      question,
      modelAnswer: modelAnswers[index] || 'Not enough information in the provided material.'
    }));

    const questionSet = await QuestionSet.create({
      teacherId: req.user._id,
      materialId: material?._id,
      testId,
      questions: limitedQuestions,
      modelAnswers,
      difficulty: 'medium',
      customPrompt: 'question paper upload',
      retrievedChunkCount: uniqueChunks.length
    });

    const perQuestionMarks = Math.max(1, Math.min(100, Number(maxMarks) || 10));
    await Promise.all(
      questionPairs.map((pair) =>
        ModelAnswer.create({
          teacherId: req.user._id,
          testId,
          questionText: pair.question,
          modelAnswer: pair.modelAnswer,
          maxMarks: perQuestionMarks
        })
      )
    );

    res.json({
      questions: limitedQuestions,
      modelAnswers,
      questionPairs,
      questionSetId: questionSet._id,
      extractedBy: method,
      totalQuestions: limitedQuestions.length
    });
  } catch (err) {
    console.error('[Question Paper] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process question paper.' });
  }
});

module.exports = router;
