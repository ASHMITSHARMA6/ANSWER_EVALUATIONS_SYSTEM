const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const StudyMaterial = require('../models/StudyMaterial');
const Chunk = require('../models/Chunk');
const auth = require('../middleware/auth');

// Vector DB & Embedding services
const vectorDbService = require('../services/vectorDbService');
const embeddingService = require('../services/embeddingService');
const chunkingService = require('../services/chunkingService');
const { getOrCreateCanonicalMaterial } = require('../services/canonicalMaterialService');

const router = express.Router();

// Multer: memory storage for PDF (max 10MB). Used only for multipart requests.
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

// Run multer only when request is multipart (PDF upload). Otherwise next() for JSON body.
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

/**
 * POST /api/upload-material
 * Accepts: (1) JSON { material } or (2) multipart with PDF file
 * 
 * Process:
 * 1. Extract text from PDF or use provided text
 * 2. Chunk text for semantic search
 * 3. Generate embeddings via OpenAI or mock
 * 4. Store vectors in FAISS vector DB
 * 5. Store metadata in MongoDB
 */
router.post('/', auth, maybeMulter, async (req, res) => {
  try {
    const { testId } = req.body || {};
    if (!testId) {
      return res.status(400).json({ error: 'Select a test before uploading material.' });
    }
    let content = '';

    // Step 1: Extract text from PDF or use provided text
    if (req.file) {
      try {
        const data = await pdfParse(req.file.buffer);
        content = (data && data.text) ? String(data.text).trim() : '';
      } catch (e) {
        return res.status(400).json({ 
          error: 'Could not extract text from PDF. Ensure it is a text-based PDF (not only images).' 
        });
      }
      if (!content) {
        return res.status(400).json({ 
          error: 'No text found in PDF. Use a text-based PDF or paste the content as text.' 
        });
      }
    } else if (req.body && typeof req.body.material === 'string') {
      content = req.body.material.trim();
    } else {
      return res.status(400).json({ 
        error: 'Provide material (paste text) or upload a PDF file.' 
      });
    }

    if (!content) {
      return res.status(400).json({ error: 'Material content is empty.' });
    }

    // Step 2: Store canonical material and material reference
    const canonical = await getOrCreateCanonicalMaterial({
      teacherId: req.user._id,
      content,
      title: `Material for test ${testId}`
    });

    const material = await StudyMaterial.create({
      teacherId: req.user._id,
      testId,
      content,
      canonicalMaterialId: canonical._id || canonical.id
    });

    if (canonical && !canonical.sourceMaterialId) {
      await StudyMaterial.updateOne(
        { _id: material._id },
        { $set: { canonicalMaterialId: canonical._id || canonical.id } }
      );
      await require('../models/CanonicalMaterial').updateOne(
        { _id: canonical._id || canonical.id, sourceMaterialId: { $exists: false } },
        { $set: { sourceMaterialId: material._id } }
      );
    }

    // Step 3: Chunk text
    const chunks = chunkingService.chunkTextForQA(content, material._id.toString());
    const filteredChunks = chunkingService.filterChunks(chunks, minLength = 30);

    if (filteredChunks.length === 0) {
      return res.status(400).json({ error: 'Material too short or no valid chunks.' });
    }

    // Step 4: Generate embeddings
    const chunkTexts = filteredChunks.map(c => c.text);
    const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);

    // Step 5: Add to vector DB
    vectorDbService.addMaterialEmbeddings(
      embeddings,
      filteredChunks.map(c => ({
        text: c.text,
        source: c.source,
        section: c.section,
        startIdx: c.startIdx,
        endIdx: c.endIdx,
        order: c.order,
        testId
      }))
    );

    // Step 6: Store chunk metadata in MongoDB for reference
    for (let i = 0; i < filteredChunks.length; i++) {
      await Chunk.create({
        text: filteredChunks[i].text,
        source: material._id,
        testId,
        section: filteredChunks[i].section,
        order: filteredChunks[i].order,
        startIdx: filteredChunks[i].startIdx,
        endIdx: filteredChunks[i].endIdx,
        length: filteredChunks[i].text.length,
        isAnswer: false,
        userId: req.user._id
      });
    }

    const stats = chunkingService.getChunkStats(filteredChunks);
    console.log('[Upload Material] Processing complete:', {
      materialId: material._id,
      chunks: filteredChunks.length,
      stats
    });

    res.status(201).json({
      id: material._id,
      message: 'Material uploaded and processed successfully',
      chunks: filteredChunks.length,
      stats
    });
  } catch (err) {
    console.error('[Upload Material] Error:', err.message);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

module.exports = router;
