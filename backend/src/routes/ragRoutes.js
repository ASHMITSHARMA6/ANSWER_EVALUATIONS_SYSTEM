/**
 * RAG Routes
 * Exposes the RAG service as REST endpoints.
 * Purely additive — does not touch any existing route.
 */

const express = require('express');
const router = express.Router();
const ragService = require('../services/ragService');

/**
 * POST /api/rag/query
 * Body: { query: string, topK?: number, mode?: 'qa'|'summarize'|'evaluate', debug?: boolean }
 * Returns: { answer, sources, model, prompt? }
 */
router.post('/query', async (req, res) => {
  try {
    const { query, topK, mode, debug } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "query" string is required' });
    }

    const result = await ragService.query(query.trim(), {
      topK: topK || 5,
      mode: mode || 'qa',
      debug: !!debug,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[RAG Route] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rag/evaluate
 * Body: { studentAnswer: string, question?: string, topK?: number }
 * Returns: { score, matchedConcepts, missingConcepts, feedback, ragSources }
 *
 * This is an ALTERNATIVE evaluation path that uses uploaded material
 * as the ground truth (instead of a teacher-provided model answer).
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { studentAnswer, question, topK } = req.body;

    if (!studentAnswer || typeof studentAnswer !== 'string' || studentAnswer.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "studentAnswer" string is required' });
    }

    const result = await ragService.evaluateWithRAG(
      studentAnswer.trim(),
      (question || '').trim(),
      topK || 5
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[RAG Evaluate Route] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rag/retrieve
 * Body: { query: string, topK?: number }
 * Returns: { sources: [...] }  (retrieval only, no LLM call)
 */
router.post('/retrieve', async (req, res) => {
  try {
    const { query, topK } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'A non-empty "query" string is required' });
    }

    const sources = await ragService.retrieveContext(query.trim(), topK || 5);

    res.json({ success: true, count: sources.length, sources });
  } catch (error) {
    console.error('[RAG Retrieve Route] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
