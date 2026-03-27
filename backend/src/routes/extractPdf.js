const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer: memory storage for PDF extraction
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
}).single('file');

/**
 * POST /api/extract-pdf
 * Extract text from PDF file for model answers
 * Returns: { text: string }
 */
router.post('/', auth, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false,
        error: err.message || 'File upload failed' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file provided' 
      });
    }

    try {
      const data = await pdfParse(req.file.buffer);
      const text = (data && data.text) ? String(data.text).trim() : '';

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'No text found in PDF. Ensure it is a text-based PDF (not only images).'
        });
      }

      res.json({ 
        success: true,
        text: text,
        pages: data.numpages || 1,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message: `Successfully extracted ${text.length} characters from ${data.numpages || 1} page(s)`
      });
    } catch (err) {
      console.error('PDF extraction error:', err);
      res.status(400).json({
        success: false,
        error: 'Could not extract text from PDF. Ensure it is a text-based PDF (not only images).'
      });
    }
  });
});

module.exports = router;
