/**
 * OCR & Evaluation Routes
 * Handles handwritten answer extraction and AI evaluation
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ocrService = require('../services/ocrService');
const evaluationService = require('../services/evaluationService');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Optional auth middleware — sets req.user if token is valid, but does NOT reject
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      const userId = decoded.userId || decoded.id || decoded._id;
      if (userId) {
        const user = await User.findById(userId).select('-password');
        if (user) req.user = user;
      }
    }
  } catch (err) {
    // Token invalid/expired — that's fine, just no user context
  }
  next();
};

const router = express.Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../../uploads/handwritten');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    cb(null, `${timestamp}-${randomStr}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — images are compressed by ocrService before API call
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'application/pdf',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

/**
 * POST /api/ocr/extract
 * Extract text from uploaded image or PDF
 */
router.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[OCR Route] Processing file: ${req.file.filename}`);

    // Extract text using OCR
    const extractedText = await ocrService.extractText(req.file.path);

    // Clean up: delete file after extraction (optional)
    // fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      extractedText,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      message: 'Text extracted successfully',
    });
  } catch (error) {
    console.error('[OCR Route] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract text from file',
    });
  }
});

/**
 * POST /api/ocr/extract-batch
 * Extract text from multiple files
 */
router.post('/extract-batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`[OCR Batch Route] Processing ${req.files.length} files`);

    const filePaths = req.files.map((f) => f.path);
    const results = await ocrService.extractTextFromMultipleFiles(filePaths);

    res.json({
      success: true,
      totalFiles: req.files.length,
      results,
      message: `Text extracted from ${results.filter((r) => r.success).length} files`,
    });
  } catch (error) {
    console.error('[OCR Batch Route] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract text from files',
    });
  }
});

/**
 * POST /api/evaluate/handwritten
 * Evaluate handwritten answer (OCR + AI evaluation)
 * Combines OCR extraction with AI evaluation in one endpoint
 */
router.post('/handwritten', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { modelAnswer, question } = req.body;
    if (!modelAnswer) {
      return res.status(400).json({ error: 'Model answer is required' });
    }

    console.log(`[Evaluate Handwritten] Processing: ${req.file.filename}`);

    // Step 1: Extract text from handwritten image/PDF
    const studentAnswer = await ocrService.extractText(req.file.path);

    if (!studentAnswer.trim()) {
      return res.status(400).json({
        error: 'Could not extract any text from the uploaded file. Please ensure the image is clear.',
      });
    }

    console.log(`[Evaluate Handwritten] Extracted ${studentAnswer.length} characters`);

    // Step 2: Evaluate the extracted text
    const evaluation = await evaluationService.evaluateAnswer(
      studentAnswer,
      modelAnswer,
      question || ''
    );

    res.json({
      success: true,
      extractedText: studentAnswer,
      evaluation,
      fileName: req.file.originalname,
      message: 'Handwritten answer processed and evaluated',
    });
  } catch (error) {
    console.error('[Evaluate Handwritten] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process handwritten answer',
    });
  }
});

/**
 * POST /api/evaluate/text
 * Evaluate student answer (text only, no OCR needed)
 * If modelAnswer is not provided but user is authenticated, fetches latest from DB
 */
router.post('/text', optionalAuth, async (req, res) => {
  try {
    const { studentAnswer, question, testId } = req.body;
    let { modelAnswer } = req.body;

    if (!studentAnswer) {
      return res
        .status(400)
        .json({ error: 'Student answer is required' });
    }

    // If no model answer provided, try fetching from database
    if (!modelAnswer || !modelAnswer.trim()) {
      if (req.user) {
        try {
          const ModelAnswer = require('../models/ModelAnswer');
          const filter = { teacherId: req.user._id };
          if (testId) filter.testId = testId;
          const doc = await ModelAnswer.findOne(filter)
            .sort({ createdAt: -1 })
            .lean();
          if (doc) {
            modelAnswer = doc.modelAnswer;
            console.log('[Evaluate Text] Using model answer from DB:', doc._id);
          }
        } catch (dbErr) {
          console.error('[Evaluate Text] DB fetch error:', dbErr.message);
        }
      }

      if (!modelAnswer || !modelAnswer.trim()) {
        return res.status(400).json({
          error: 'No model answer provided and none found in database. Please upload a model answer first or provide one.',
        });
      }
    }

    console.log('[Evaluate Text] Processing text evaluation');

    const evaluation = await evaluationService.evaluateAnswer(
      studentAnswer,
      modelAnswer,
      question || ''
    );

    res.json({
      success: true,
      evaluation,
      modelAnswerSource: req.body.modelAnswer ? 'provided' : 'database',
      message: 'Answer evaluated successfully',
    });
  } catch (error) {
    console.error('[Evaluate Text] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to evaluate answer',
    });
  }
});

module.exports = router;
