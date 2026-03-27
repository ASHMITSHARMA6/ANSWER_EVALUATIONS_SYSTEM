const express = require('express');
const Test = require('../models/Test');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/tests - list tests for teacher
router.get('/', auth, async (req, res) => {
  try {
    const tests = await Test.find({ teacherId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ tests });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch tests' });
  }
});

// GET /api/tests/latest - latest test
router.get('/latest', auth, async (req, res) => {
  try {
    const test = await Test.findOne({ teacherId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    if (!test) return res.json({ found: false, test: null });
    res.json({ found: true, test });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch latest test' });
  }
});

// POST /api/tests - create new test
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Test name is required' });
    }
    const test = await Test.create({
      teacherId: req.user._id,
      name: String(name).trim(),
      description: String(description || '').trim(),
    });
    res.status(201).json({ test });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create test' });
  }
});

module.exports = router;
