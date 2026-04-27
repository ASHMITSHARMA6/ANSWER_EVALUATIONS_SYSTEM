const express = require('express');
const ModelAnswer = require('../models/ModelAnswer');
const StudentAnswer = require('../models/StudentAnswer');
const EvaluationResult = require('../models/EvaluationResult');
const MarkingScheme = require('../models/MarkingScheme');
const auth = require('../middleware/auth');

// Vector DB & AI services
const { evaluateAnswerWithRetrieval } = require('../services/aiService');
const vectorDbService = require('../services/vectorDbService');
const embeddingService = require('../services/embeddingService');
const chunkingService = require('../services/chunkingService');
const knowledgeGraphService = require('../services/knowledgeGraphService');

const router = express.Router();

function buildRubricPayload(markingScheme, fallbackRubric, maxMarks) {
  if (!markingScheme) return fallbackRubric;

  const concepts = Array.isArray(markingScheme.keyConcepts) ? markingScheme.keyConcepts : [];
  const criticalErrors = Array.isArray(markingScheme.criticalErrors) ? markingScheme.criticalErrors : [];

  const conceptFirst = {
    type: 'concept_first_v1',
    text: markingScheme.rubricText || fallbackRubric || 'Standard rubric',
    maxMarks: Number(maxMarks) || Number(markingScheme.maxMarks) || 10,
    requiredConcepts: concepts.map((item) => ({
      concept: item.concept,
      weight: Number(item.marks) || 1,
      required: !!item.isRequired,
      synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
      depthLevels: {
        mention: Number(item?.depthLevels?.mention) || 1,
        explanation: Number(item?.depthLevels?.explanation) || 2,
        linkage: Number(item?.depthLevels?.linkage) || 3
      }
    })),
    criticalErrors: criticalErrors.map((err) => ({
      statement: err.statement,
      synonyms: Array.isArray(err.synonyms) ? err.synonyms : [],
      penalty: Number(err.penalty) || 1,
      explanation: err.explanation || ''
    }))
  };

  // If concept-first is explicitly enabled or depth/synonyms exist, prefer structured rubric.
  const hasAdvancedConceptFields = conceptFirst.requiredConcepts.some((c) =>
    (c.synonyms && c.synonyms.length > 0) ||
    (c.depthLevels && (c.depthLevels.explanation > 1 || c.depthLevels.linkage > 1))
  );

  if (markingScheme.conceptFirstEnabled || hasAdvancedConceptFields || conceptFirst.criticalErrors.length > 0) {
    return conceptFirst;
  }

  return markingScheme.rubricText || fallbackRubric;
}

/**
 * POST /api/evaluate-answer
 * Evaluate student answer using vector-retrieved model answer context + LLM
 * 
 * CRITICAL: Uses semantic retrieval to avoid hallucination
 * 
 * Process:
 * 1. Retrieve latest model answer and student answer
 * 2. Chunk and embed model answer
 * 3. Embed student answer
 * 4. Query vector DB for top-k model answer chunks
 * 5. Pass retrieved context + student answer to LLM
 * 6. LLM scores STRICTLY based on retrieved context
 * 7. Store result with full evaluation details
 */
router.post('/', auth, async (req, res) => {
  try {
    const { maxMarks: overrideMax, rubric, testId } = req.body;
    if (!testId) {
      return res.status(400).json({ error: 'Select a test before evaluating answers.' });
    }

    // Step 1: Get latest model answer and student answer
    const modelDocs = await ModelAnswer.find({ teacherId: req.user._id, testId })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();
    const studentDocs = await StudentAnswer.find({
      teacherId: req.user._id,
      testId,
      batchId: null
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    if (!modelDocs || modelDocs.length === 0) {
      return res.status(400).json({ error: 'Upload a model answer first' });
    }
    if (!studentDocs || studentDocs.length === 0) {
      return res.status(400).json({
        error: 'Upload a single student answer first (batch answers are evaluated from Batch Upload).'
      });
    }

    const modelDoc = modelDocs[0];
    const studentDoc = studentDocs[0];

    const maxMarks = overrideMax != null 
      ? Math.max(1, Math.min(100, Number(overrideMax) || 10)) 
      : modelDoc.maxMarks;

    // Step 2: Chunk model answer and generate embeddings
    const modelAnswerChunks = chunkingService.chunkAnswerForEvaluation(
      modelDoc.modelAnswer,
      modelDoc._id.toString(),
      'model_answer'
    );
    const filteredModelChunks = chunkingService.filterChunks(modelAnswerChunks, minLength = 10);

    if (filteredModelChunks.length > 0) {
      // Generate embeddings for model answer chunks
      const modelChunkTexts = filteredModelChunks.map(c => c.text);
      const modelEmbeddings = await embeddingService.generateBatchEmbeddings(modelChunkTexts);

      // Add to answer vector index
      vectorDbService.addAnswerEmbeddings(
        modelEmbeddings,
        filteredModelChunks.map(c => ({
          text: c.text,
          questionId: c.questionId,
          maxScore: maxMarks,
          testId
        }))
      );
    }

    // Step 3: Embed student answer
    const studentAnswerEmbedding = await embeddingService.generateEmbedding(studentDoc.studentAnswer);

    // Step 4: Query vector DB for relevant model answer chunks
  const retrievedModelAnswerChunks = vectorDbService.queryAnswers(studentAnswerEmbedding, topK = 5, testId);

    console.log('[Evaluate Answer]', {
      modelAnswerId: modelDoc._id,
      studentAnswerId: studentDoc._id,
      retrievedChunks: retrievedModelAnswerChunks.length,
      maxMarks
    });

    // Step 5: Try to get marking scheme for this question
    let markingScheme = null;
    let rubricText = null;

    // First try to find by question text
    markingScheme = await MarkingScheme.findOne({
      teacherId: req.user._id,
      questionText: modelDoc.questionText
    });

    if (markingScheme) {
      // Use the detailed rubric from marking scheme
      rubricText = markingScheme.rubricText;
      console.log('[Evaluate Answer] Using marking scheme:', markingScheme._id);
    } else if (rubric) {
      // Use provided rubric from request
      rubricText = typeof rubric === 'string' ? rubric : JSON.stringify(rubric, null, 2);
      console.log('[Evaluate Answer] Using custom rubric from request');
    } else {
      // Use default rubric
      rubricText = `
Full marks (${Math.round(maxMarks * 0.9)}-${maxMarks}): Complete and accurate answer
Partial marks (${Math.round(maxMarks * 0.5)}-${Math.round(maxMarks * 0.8)}): Partially correct, missing details
Low marks (1-${Math.round(maxMarks * 0.4)}): Partially correct, significant gaps
Zero marks (0): Completely wrong or off-topic
`;
      console.log('[Evaluate Answer] Using default rubric');
    }

    // Step 6: Call AI service with retrieved context and marking scheme
    const rubricPayload = buildRubricPayload(markingScheme, rubricText, maxMarks);

    const evaluation = await evaluateAnswerWithRetrieval(
      modelDoc.questionText,
      retrievedModelAnswerChunks.length > 0 
        ? retrievedModelAnswerChunks 
        : [{ text: modelDoc.modelAnswer, questionId: modelDoc._id }],
      studentDoc.studentAnswer,
      maxMarks,
      rubricPayload
    );

    // Step 6b: Enrich with knowledge graph related concepts (non-blocking)
    let graphConcepts = [];
    try {
      const related = await knowledgeGraphService.getRelatedConceptsForText({
        text: `${modelDoc.questionText || ''}\n${studentDoc.studentAnswer || ''}`,
        testId,
        limit: 8
      });
      graphConcepts = related.map((node) => node.name);
    } catch (kgErr) {
      console.warn('[Evaluate Answer] Knowledge graph lookup skipped:', kgErr.message);
    }

    // Step 7: Store result in MongoDB with full details
    // Defensive numeric coercion for score from AI evaluation
    let numericScore = Number(evaluation.score);
    if (!Number.isFinite(numericScore)) {
      numericScore = Number(evaluation.marks_breakdown && evaluation.marks_breakdown.total);
    }
    if (!Number.isFinite(numericScore)) numericScore = 0;

    const result = await EvaluationResult.create({
      teacherId: req.user._id,
      testId,
      studentName: studentDoc.studentName || 'Anonymous',
      questionText: modelDoc.questionText,
      modelAnswer: modelDoc.modelAnswer,
      studentAnswer: studentDoc.studentAnswer,
      marks: numericScore,
      maxMarks,
      matchedConcepts: evaluation.matched_concepts || [],
      missingConcepts: evaluation.missing_concepts || [],
      feedback: evaluation.feedback || 'Evaluation complete.',
      retrievedChunkCount: retrievedModelAnswerChunks.length,
      evaluationMethod: 'vector_retrieval_llm',
      graphConcepts,
      markingSchemeId: markingScheme ? markingScheme._id : null,
      marksBreakdown: evaluation.marks_breakdown || {}
    });

    res.json({
      evaluationId: result._id,
      // include both legacy 'marks' and 'score' to be resilient to frontend expectations
      marks: numericScore,
      score: numericScore,
      maxMarks,
      matchedConcepts: evaluation.matched_concepts,
      missingConcepts: evaluation.missing_concepts,
      graphConcepts,
      feedback: evaluation.feedback,
      marksBreakdown: evaluation.marks_breakdown,
      retrievedChunks: retrievedModelAnswerChunks.length,
      usingMarkingScheme: !!markingScheme,
      message: markingScheme ? 'Evaluation complete using marking scheme' : 'Evaluation complete using default rubric'
    });
  } catch (err) {
    console.error('[Evaluate Answer] Error:', err.message);
    res.status(500).json({ error: err.message || 'Evaluation failed' });
  }
});

module.exports = router;
