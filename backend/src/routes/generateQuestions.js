const express = require('express');
const StudyMaterial = require('../models/StudyMaterial');
const QuestionSet = require('../models/QuestionSet');
const auth = require('../middleware/auth');

// Vector DB & AI services
const { generateQuestionsWithRetrieval } = require('../services/aiService');
const vectorDbService = require('../services/vectorDbService');
const embeddingService = require('../services/embeddingService');
const chunkingService = require('../services/chunkingService');
const knowledgeGraphService = require('../services/knowledgeGraphService');
const CanonicalMaterial = require('../models/CanonicalMaterial');
const cacheService = require('../services/cacheService');
const { extractChapterRanges } = require('../services/chapterExtractionService');

const QGEN_RETRIEVAL_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const QGEN_RESULT_CACHE_VERSION = 'v2';
const PLACEHOLDER_ANSWER_RE = /not enough information in the provided material\.?/i;

const router = express.Router();

/**
 * POST /api/generate-questions
 * Generate questions using vector retrieval + LLM
 * 
 * Process:
 * 1. Retrieve latest study material
 * 2. Query vector DB for relevant chunks (based on material ID or optional topic)
 * 3. Pass retrieved chunks to LLM for question generation
 * 4. Store generated questions in MongoDB
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      difficulty = 'medium',
      numQuestions = 5,
      count,
      topic,
      sessionId,
      customPrompt = '',
      chapterName,
      chapterNumber,
      chapterSelections,
      materialId,
      testId,
      useGraph = false,
      graphLimit = 6,
      graphWeight = 0.9
    } = req.body;
  const questionCount = numQuestions || count || 5;

    if (!testId) {
      return res.status(400).json({ error: 'Select a test before generating questions.' });
    }

    console.log(`[Generate Questions] 📋 Request received:`, {
      difficulty,
      questionCount,
      topic,
      customPrompt: customPrompt ? customPrompt.substring(0, 50) + '...' : 'none',
      chapterName: chapterName || 'none',
      chapterNumber: chapterNumber || 'none',
      chapterSelectionsCount: Array.isArray(chapterSelections) ? chapterSelections.length : 0,
      useGraph: !!useGraph
    });

    // Step 1: Get material (by study material id or canonical material id)
    let material = null;

    if (materialId) {
      material = await StudyMaterial.findOne({
        _id: materialId,
        teacherId: req.user._id,
        testId
      })
        .lean();

      if (!material) {
        material = await StudyMaterial.findOne({
          canonicalMaterialId: materialId,
          teacherId: req.user._id,
          testId
        })
          .lean();
      }
    }

    if (!material) {
      material = await StudyMaterial.findOne({ teacherId: req.user._id, testId })
        .sort({ createdAt: -1 })
        .lean();
    }
    
    if (!material) {
      console.warn('[Generate Questions] ⚠️ No study material found for this teacher');
      return res.status(400).json({ error: 'Upload study material first' });
    }
    
    console.log(`[Generate Questions] ✅ Found material: ${material._id}`);

    let materialContent = material.content;
    if (!materialContent && material.canonicalMaterialId) {
      const canonical = await CanonicalMaterial.findById(material.canonicalMaterialId).lean();
      materialContent = canonical?.content || '';
    }

    if (!materialContent || !materialContent.trim()) {
      return res.status(400).json({ error: 'Material content missing for this test. Please upload or reference a material.' });
    }

    // Step 2: Query vector DB
    // Option A: If topic or custom prompt provided, embed and query
    // Option B: Otherwise, retrieve top chunks by material ID (first N chunks)
    let retrievedChunks = [];
    const normalizedSelections = Array.isArray(chapterSelections)
      ? chapterSelections
          .filter((item) => item && (item.number || item.name || item.title))
          .map((item) => ({
            number: item.number ? String(item.number).trim() : '',
            name: item.name ? String(item.name).trim() : '',
            title: item.title ? String(item.title).trim() : ''
          }))
      : [];

    const selectionContext = normalizedSelections
      .map((item) => {
        if (item.title) return item.title;
        if (item.number && item.name) return `Chapter ${item.number} - ${item.name}`;
        if (item.number) return `Chapter ${item.number}`;
        return item.name;
      })
      .filter(Boolean)
      .join(' | ');

    const legacyContext = [chapterNumber, chapterName]
      .filter((value) => value && String(value).trim())
      .map((value, index) => (index === 0 && chapterNumber ? `Chapter ${chapterNumber}` : String(value).trim()))
      .join(' - ');

    const chapterContext = selectionContext || legacyContext;

    const normalizeMatch = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const selectionMatches = (range) => {
      return normalizedSelections.some((selection) => {
        if (selection.number && range.number && String(selection.number) === String(range.number)) {
          return true;
        }
        const selectionTitle = normalizeMatch(selection.title);
        const selectionName = normalizeMatch(selection.name);
        const rangeTitle = normalizeMatch(range.title);
        const rangeName = normalizeMatch(range.name);

        if (selectionTitle && rangeTitle && (rangeTitle === selectionTitle || rangeTitle.includes(selectionTitle))) {
          return true;
        }
        if (selectionName && rangeName && (rangeName === selectionName || rangeName.includes(selectionName))) {
          return true;
        }
        return false;
      });
    };

    const effectivePrompt = [customPrompt, chapterContext]
      .filter((value) => value && String(value).trim())
      .join(' | ');

    const queryText = effectivePrompt || topic || chapterContext || 'study material';

    const questionCacheKey = `qgen:result:${QGEN_RESULT_CACHE_VERSION}:${testId}:${materialId || 'latest'}:${queryText || 'study material'}:${difficulty}:${questionCount}:${sessionId || 'none'}:${useGraph ? 1 : 0}:${graphLimit}:${graphWeight}`;
    const cachedResult = cacheService.get(questionCacheKey);
    if (cachedResult) {
      const cachedAnswers = Array.isArray(cachedResult.modelAnswers) ? cachedResult.modelAnswers : [];
      const allPlaceholders = cachedAnswers.length > 0
        && cachedAnswers.every((answer) => PLACEHOLDER_ANSWER_RE.test(String(answer || '').trim()));

      if (!allPlaceholders) {
        console.log(`[Generate Questions] ⚡ Using cached result (${cachedResult.questions?.length || 0})`);
        return res.json(cachedResult);
      }

      console.warn('[Generate Questions] ⚠️ Ignoring stale cached result with placeholder model answers');
    }

  const cacheKey = `qgen:retrieval:${testId}:${material._id}:${queryText || 'study material'}:${useGraph ? 1 : 0}:${graphLimit}:${graphWeight}`;
    const cachedChunks = cacheService.get(cacheKey);

    if (cachedChunks) {
      retrievedChunks = cachedChunks;
      console.log(`[Generate Questions] ⚡ Using cached chunks (${retrievedChunks.length})`);
    } else if (normalizedSelections.length > 0) {
      const ranges = extractChapterRanges(materialContent);
      const selectedRanges = ranges.filter(selectionMatches);
      const selectedContent = selectedRanges.map((range) => range.content).join('\n\n');

      if (selectedContent.trim()) {
        console.log(`[Generate Questions] 📚 Using ${selectedRanges.length} selected chapters for retrieval`);
        const chunked = chunkingService.chunkTextForQA(selectedContent, material._id.toString());
        retrievedChunks = chunkingService.filterChunks(chunked, 30).slice(0, 20);
        cacheService.set(cacheKey, retrievedChunks, QGEN_RETRIEVAL_CACHE_TTL_MS);
      }
    }

    if (retrievedChunks.length === 0 && queryText && queryText.trim()) {
      // Embed the query and retrieve similar chunks
      console.log(`[Generate Questions] 📝 Custom Query: "${queryText.substring(0, 60)}..."`);
      const queryEmbedding = await embeddingService.generateEmbedding(queryText);
      const baseResults = vectorDbService.queryMaterial(queryEmbedding, 15, testId);

      const merged = new Map();
      const pushResult = (result, score) => {
        const key = `${result.source || 'unknown'}:${result.index}`;
        const existing = merged.get(key);
        if (!existing || score > existing.score) {
          merged.set(key, {
            ...result,
            score
          });
        }
      };

      baseResults.forEach((r) => pushResult(r, r.score));

      if (useGraph && testId) {
        const related = await knowledgeGraphService.getRelatedConceptsForText({
          text: queryText,
          testId,
          limit: graphLimit
        });

        if (related.length > 0) {
          const expansions = related.map((node) => `${queryText} ${node.name}`.trim());
          const embeddings = await embeddingService.generateBatchEmbeddings(expansions);

          embeddings.forEach((embedding) => {
            const hits = vectorDbService.queryMaterial(embedding, 8, testId);
            hits.forEach((hit) => pushResult(hit, hit.score * graphWeight));
          });
        }
      }

      retrievedChunks = Array.from(merged.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      cacheService.set(cacheKey, retrievedChunks, QGEN_RETRIEVAL_CACHE_TTL_MS);
      console.log(`[Generate Questions] ✅ Retrieved ${retrievedChunks.length} chunks for custom query`);
    } else if (retrievedChunks.length === 0) {
      // Get chunks from latest material by querying a generic embedding of the material title
      const materialEmbedding = await embeddingService.generateEmbedding('study material');
      const allChunks = vectorDbService.queryMaterial(materialEmbedding, 15, testId);
      retrievedChunks = allChunks;
      cacheService.set(cacheKey, retrievedChunks, QGEN_RETRIEVAL_CACHE_TTL_MS);
      console.log(`[Generate Questions] ✅ Retrieved ${retrievedChunks.length} chunks (no specific query)`);
    }

    if (retrievedChunks.length === 0) {
      // Fallback: use material content directly
      console.warn('[Generate Questions] ⚠️ No chunks retrieved from vector DB. Using fallback.');
      retrievedChunks = [{
        text: materialContent.substring(0, 2000),
        source: material._id,
        section: 'raw_material'
      }];
    }

    // Log retrieved chunks info
    console.log(`[Generate Questions] 📦 Chunk details:`, {
      count: retrievedChunks.length,
      totalChars: retrievedChunks.reduce((sum, c) => sum + (c.text ? c.text.length : 0), 0)
    });

    // Step 3a: Get past questions from this session to avoid repetition
    let pastQuestions = [];
    if (sessionId) {
      const previousQuestionSet = await QuestionSet.findById(sessionId).lean();
      if (previousQuestionSet) {
        pastQuestions = previousQuestionSet.questions || [];
        console.log(`[Generate Questions] 🔄 Retrieved ${pastQuestions.length} past questions to avoid repetition`);
      }
    }

    // Step 3b: Call AI service with retrieved chunks and custom prompt
    console.log(`[Generate Questions] 🤖 Calling AI service...`);
    const variationToken = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await generateQuestionsWithRetrieval(
      retrievedChunks,
      difficulty,
      Math.min(20, Math.max(1, Number(questionCount) || 5)),
      effectivePrompt || undefined,   // Pass custom prompt to AI service
      pastQuestions,
      variationToken
    );

    if (result.error) {
      console.error('[Generate Questions] ❌ AI service returned error:', result.error);
      return res.status(502).json({ error: result.error });
    }

    console.log(`[Generate Questions] ✅ Generated ${result.questions.length} questions`);
    const fallbackMessage = result.modelAnswerWarning
      ? 'Model answers generated with fallback parsing.'
      : 'Model answer unavailable. Check GROQ_API_KEY or model response.';
    const modelAnswers = Array.isArray(result.modelAnswers) && result.modelAnswers.length
      ? result.modelAnswers
      : result.questions.map(() => fallbackMessage);
    const questionPairs = result.questions.map((question, index) => ({
      question,
      modelAnswer: modelAnswers[index] || fallbackMessage
    }));

    // Step 4: Store in MongoDB
    const questionSet = await QuestionSet.create({
  teacherId: req.user._id,
  materialId: material._id,
  testId,
      questions: result.questions,
  modelAnswers,
      difficulty,
      customPrompt: customPrompt || undefined, // Store the custom prompt used
      retrievedChunkCount: retrievedChunks.length
    });

    console.log(`[Generate Questions] 💾 Saved to MongoDB: ${questionSet._id}`);

    const responsePayload = {
      questions: result.questions,
      modelAnswers,
      questionPairs,
      questionSetId: questionSet._id,
      retrievedChunks: retrievedChunks.length,
      message: customPrompt ? 'Questions generated using custom query' : 'Questions generated from study material',
      warning: result.warning || undefined
    };

    if (!result.usedFallback) {
      cacheService.set(questionCacheKey, responsePayload);
    } else {
      console.warn('[Generate Questions] ⚠️ Skipping cache due to fallback generation');
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('[Generate Questions] ❌ Error:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({ 
      error: err.message || 'Generation failed',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// GET /api/generate-questions/latest — fetch latest generated questions + model answers
router.get('/latest', auth, async (req, res) => {
  try {
    const { testId } = req.query;
    const filter = { teacherId: req.user._id };
    if (testId) filter.testId = testId;

    const questionSet = await QuestionSet.findOne(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (!questionSet) {
      return res.json({ found: false, questionSet: null, questionPairs: [] });
    }

    const questions = questionSet.questions || [];
    const modelAnswers = questionSet.modelAnswers || [];
    const questionPairs = questions.map((question, index) => ({
      question,
      modelAnswer: modelAnswers[index] || ''
    }));

    res.json({
      found: true,
      questionSetId: questionSet._id,
      questionSet,
      questionPairs
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch latest question set' });
  }
});

module.exports = router;
