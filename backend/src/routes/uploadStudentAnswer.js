const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const StudentAnswer = require('../models/StudentAnswer');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer: memory storage for PDF answer sheets (max 10MB). Used only for multipart.
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

// POST /api/upload-student-answer — (1) JSON { studentAnswer, studentName } or (2) multipart with PDF file (+ optional studentName)
router.post('/', auth, maybeMulter, async (req, res) => {
  try {
    const { testId } = req.body || {};
    if (!testId) {
      return res.status(400).json({ error: 'Select a test before uploading student answers.' });
    }
    let studentAnswer = '';
    let studentName = (req.body && req.body.studentName) ? String(req.body.studentName).trim() : '';

    if (req.file) {
      try {
        const data = await pdfParse(req.file.buffer);
        studentAnswer = (data && data.text) ? String(data.text).trim() : '';
      } catch (e) {
        return res.status(400).json({ error: 'Could not extract text from PDF. Use a text-based PDF (not image-only).' });
      }
      if (!studentAnswer) {
        return res.status(400).json({ error: 'No text found in PDF. Use a text-based answer sheet or paste the answer as text.' });
      }
    } else if (req.body && typeof req.body.studentAnswer === 'string') {
      studentAnswer = req.body.studentAnswer.trim();
      if (!studentName) studentName = (req.body.studentName || 'Student').trim() || 'Student';
    } else {
      return res.status(400).json({ error: 'Provide student answer (paste text) or upload a PDF answer sheet.' });
    }

    if (!studentAnswer) {
      return res.status(400).json({ error: 'Student answer is empty.' });
    }

    if (!studentName) studentName = 'Student';

    const doc = await StudentAnswer.create({
      teacherId: req.user._id,
      testId,
      studentAnswer,
      studentName,
    });
    res.status(201).json({ id: doc._id, message: 'Student answer uploaded' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

module.exports = router;
