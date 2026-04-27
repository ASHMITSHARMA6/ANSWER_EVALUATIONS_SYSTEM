const express = require('express');
const ModelAnswer = require('../models/ModelAnswer');
const auth = require('../middleware/auth');
const knowledgeGraphService = require('../services/knowledgeGraphService');

const router = express.Router();

// POST /api/upload-model-answer
router.post('/', auth, async (req, res) => {
  try {
    const { modelAnswer, questionText, maxMarks, testId } = req.body;
    if (!testId) {
      return res.status(400).json({ error: 'Select a test before uploading model answers.' });
    }
    if (!modelAnswer || typeof modelAnswer !== 'string') {
      return res.status(400).json({ error: 'Model answer text is required' });
    }
    const doc = await ModelAnswer.create({
      teacherId: req.user._id,
      testId,
      modelAnswer: modelAnswer.trim(),
      questionText: (questionText || '').trim(),
      maxMarks: Math.max(1, Math.min(100, Number(maxMarks) || 10)),
    });

    try {
      const combinedText = `${doc.questionText || ''}\n${doc.modelAnswer || ''}`.trim();
      if (combinedText) {
        await knowledgeGraphService.addConceptsFromText({
          text: combinedText,
          testId,
          sourceType: 'model_answer',
          sourceId: doc._id,
          createdBy: req.user._id
        });
      }
    } catch (kgErr) {
      console.warn('[Upload Model Answer] Knowledge graph extraction skipped:', kgErr.message);
    }
    res.status(201).json({ id: doc._id, message: 'Model answer uploaded' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// GET /api/upload-model-answer/latest — fetch latest model answer for current teacher
router.get('/latest', auth, async (req, res) => {
  try {
    const { testId } = req.query;
    const filter = { teacherId: req.user._id };
    if (testId) filter.testId = testId;
    const doc = await ModelAnswer.findOne(filter)
      .sort({ createdAt: -1 })
      .lean();
    if (!doc) {
      return res.json({ found: false, modelAnswer: null });
    }
    res.json({
      found: true,
      id: doc._id,
      modelAnswer: doc.modelAnswer,
      questionText: doc.questionText,
      maxMarks: doc.maxMarks,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch model answer' });
  }
});

// GET /api/upload-model-answer/all — list all model answers for current teacher
router.get('/all', auth, async (req, res) => {
  try {
    const { testId } = req.query;
    const filter = { teacherId: req.user._id };
    if (testId) filter.testId = testId;
    const docs = await ModelAnswer.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ count: docs.length, modelAnswers: docs });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch model answers' });
  }
});

module.exports = router;
