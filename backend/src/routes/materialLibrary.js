const express = require('express');
const auth = require('../middleware/auth');
const CanonicalMaterial = require('../models/CanonicalMaterial');
const StudyMaterial = require('../models/StudyMaterial');
const Test = require('../models/Test');
const Chunk = require('../models/Chunk');
const chunkingService = require('../services/chunkingService');
const embeddingService = require('../services/embeddingService');
const vectorDbService = require('../services/vectorDbService');
const { getOrCreateCanonicalMaterial, normalizeContent } = require('../services/canonicalMaterialService');
const { extractChapters } = require('../services/chapterExtractionService');

const router = express.Router();

// GET /api/material-library
router.get('/', auth, async (req, res) => {
  try {
    const materials = await CanonicalMaterial.find({ teacherId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();

    const sourceMaterialIds = materials
      .map((m) => m.sourceMaterialId)
      .filter(Boolean);

    const sourceMaterials = sourceMaterialIds.length
      ? await StudyMaterial.find({ _id: { $in: sourceMaterialIds } }).lean()
      : [];

    const sourceTestIds = sourceMaterials
      .map((m) => m.testId)
      .filter(Boolean);

    const derivedTestIds = materials
      .map((m) => {
        if (!m.title) return null;
        const match = String(m.title).match(/([0-9a-fA-F]{24})/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    const testIdsToFetch = [...new Set([...sourceTestIds.map(String), ...derivedTestIds])];

    const tests = testIdsToFetch.length
      ? await Test.find({ _id: { $in: testIdsToFetch } }).lean()
      : [];

    const sourceMaterialMap = new Map(sourceMaterials.map((m) => [String(m._id), m]));
    const testMap = new Map(tests.map((t) => [String(t._id), t]));

    const payload = materials.map((m) => {
      const sourceMaterial = m.sourceMaterialId
        ? sourceMaterialMap.get(String(m.sourceMaterialId))
        : null;
      const sourceTest = sourceMaterial?.testId
        ? testMap.get(String(sourceMaterial.testId))
        : null;

      let derivedTestName = '';
      if (!sourceTest && m.title) {
        const match = String(m.title).match(/([0-9a-fA-F]{24})/);
        if (match) {
          const derivedTest = testMap.get(match[1]);
          derivedTestName = derivedTest?.name || '';
        }
      }

      return {
      id: m._id,
      title: m.title,
      contentHash: m.contentHash,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      preview: (m.content || '').slice(0, 200),
        contentLength: (m.content || '').length,
        sourceTestId: sourceMaterial?.testId || null,
        sourceTestName: sourceTest?.name || derivedTestName
      };
    });

    res.json({ materials: payload });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load material library' });
  }
});

// GET /api/material-library/chapters?testId=...
router.get('/chapters', auth, async (req, res) => {
  try {
    const { testId, materialId } = req.query;
    if (!testId) {
      return res.status(400).json({ error: 'testId is required' });
    }

    const materialQuery = {
      teacherId: req.user._id,
      testId
    };

    if (materialId) {
      materialQuery._id = materialId;
    }

    const material = await StudyMaterial.findOne(materialQuery)
      .sort({ createdAt: -1 })
      .lean();

    if (!material) {
      return res.json({ chapters: [] });
    }

    let materialContent = material.content || '';
    if (!materialContent && material.canonicalMaterialId) {
      const canonical = await CanonicalMaterial.findById(material.canonicalMaterialId).lean();
      materialContent = canonical?.content || '';
    }

    const chapters = extractChapters(materialContent);
    res.json({ chapters });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to extract chapters' });
  }
});

// POST /api/material-library
// Create canonical material from content or from existing study material
router.post('/', auth, async (req, res) => {
  try {
    const { content, title, sourceMaterialId } = req.body || {};
    let materialContent = content;

    if (!materialContent && sourceMaterialId) {
      const sourceMaterial = await StudyMaterial.findOne({
        _id: sourceMaterialId,
        teacherId: req.user._id
      }).lean();
      if (!sourceMaterial) {
        return res.status(404).json({ error: 'Source material not found' });
      }
      materialContent = sourceMaterial.content || '';
    }

    if (!normalizeContent(materialContent)) {
      return res.status(400).json({ error: 'Material content is empty' });
    }

    const canonicalMaterial = await getOrCreateCanonicalMaterial({
      teacherId: req.user._id,
      content: materialContent,
      title,
      sourceMaterialId
    });

    res.status(201).json({
      id: canonicalMaterial._id || canonicalMaterial.id,
      title: canonicalMaterial.title,
      message: 'Canonical material saved'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: 'Canonical material already exists' });
    }
    res.status(500).json({ error: err.message || 'Failed to create canonical material' });
  }
});

// GET /api/material-library/references?testId=...
router.get('/references', auth, async (req, res) => {
  try {
    const { testId } = req.query;
    if (!testId) {
      return res.status(400).json({ error: 'testId is required' });
    }

    const references = await StudyMaterial.find({
      teacherId: req.user._id,
      testId,
      canonicalMaterialId: { $ne: null }
    })
      .populate('canonicalMaterialId')
      .lean();

    res.json({
      references: references.map((ref) => ({
        id: ref._id,
        canonicalMaterialId: ref.canonicalMaterialId?._id || ref.canonicalMaterialId,
        canonicalTitle: ref.canonicalMaterialId?.title || 'Canonical Material'
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load references' });
  }
});

// POST /api/material-library/reference
router.post('/reference', auth, async (req, res) => {
  try {
    const { testId, canonicalMaterialId } = req.body || {};
    if (!testId || !canonicalMaterialId) {
      return res.status(400).json({ error: 'testId and canonicalMaterialId are required' });
    }

    const canonical = await CanonicalMaterial.findOne({
      _id: canonicalMaterialId,
      teacherId: req.user._id
    }).lean();

    if (!canonical) {
      return res.status(404).json({ error: 'Canonical material not found' });
    }

    const existing = await StudyMaterial.findOne({
      teacherId: req.user._id,
      testId,
      canonicalMaterialId
    }).lean();

    if (existing) {
      return res.json({
        id: existing._id,
        reused: true,
        message: 'Material already referenced for this test'
      });
    }

    const material = await StudyMaterial.create({
      teacherId: req.user._id,
      testId,
      canonicalMaterialId,
      content: ''
    });

    const content = normalizeContent(canonical.content);
    const chunks = chunkingService.chunkTextForQA(content, material._id.toString());
    const filteredChunks = chunkingService.filterChunks(chunks, (minLength = 30));

    if (filteredChunks.length === 0) {
      return res.status(400).json({ error: 'Material too short or no valid chunks.' });
    }

    const chunkTexts = filteredChunks.map((c) => c.text);
    const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);

    vectorDbService.addMaterialEmbeddings(
      embeddings,
      filteredChunks.map((c) => ({
        text: c.text,
        source: material._id,
        section: c.section,
        startIdx: c.startIdx,
        endIdx: c.endIdx,
        order: c.order,
        testId
      }))
    );

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

    res.status(201).json({
      id: material._id,
      chunks: filteredChunks.length,
      message: 'Material referenced and indexed successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to reference material' });
  }
});

module.exports = router;
