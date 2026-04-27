const express = require('express');
const auth = require('../middleware/auth');
const knowledgeGraphService = require('../services/knowledgeGraphService');

const router = express.Router();

// GET /api/knowledge-graph/summary?testId=...
router.get('/summary', auth, async (req, res) => {
  try {
    const { testId } = req.query;
    if (!testId) return res.status(400).json({ error: 'testId is required' });
    const summary = await knowledgeGraphService.getGraphSummary({ testId });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch graph summary' });
  }
});

// GET /api/knowledge-graph/concepts?testId=...&limit=20&search=...
router.get('/concepts', auth, async (req, res) => {
  try {
    const { testId, limit, search } = req.query;
    if (!testId) return res.status(400).json({ error: 'testId is required' });
    const concepts = await knowledgeGraphService.listConcepts({
      testId,
      limit,
      search: search || ''
    });
    res.json({ count: concepts.length, concepts });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch concepts' });
  }
});

// GET /api/knowledge-graph/related?testId=...&concept=Photosynthesis&limit=8
router.get('/related', auth, async (req, res) => {
  try {
    const { testId, concept, limit } = req.query;
    if (!testId || !concept) {
      return res.status(400).json({ error: 'testId and concept are required' });
    }
    const related = await knowledgeGraphService.getRelatedConcepts({
      testId,
      concept,
      limit
    });
    res.json({ count: related.length, related });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch related concepts' });
  }
});

// POST /api/knowledge-graph/extract
// Body: { text, testId, sourceType, sourceId }
router.post('/extract', auth, async (req, res) => {
  try {
    const { text, testId, sourceType, sourceId } = req.body || {};
    if (!testId || !text) {
      return res.status(400).json({ error: 'testId and text are required' });
    }
    const result = await knowledgeGraphService.addConceptsFromText({
      text,
      testId,
      sourceType: sourceType || 'manual',
      sourceId: sourceId || null,
      createdBy: req.user._id
    });
    res.json({
      concepts: result.concepts.length,
      edges: result.edges
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to extract concepts' });
  }
});

module.exports = router;
