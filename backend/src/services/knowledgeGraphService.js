const KnowledgeNode = require('../models/KnowledgeNode');
const KnowledgeEdge = require('../models/KnowledgeEdge');

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'under', 'while', 'where', 'when',
  'which', 'about', 'their', 'there', 'have', 'has', 'had', 'been', 'were', 'was', 'are', 'is', 'it',
  'its', 'you', 'your', 'yours', 'they', 'them', 'then', 'than', 'but', 'not', 'can', 'could', 'should',
  'would', 'may', 'might', 'will', 'shall', 'also', 'only', 'such', 'most', 'more', 'less', 'some', 'any',
  'each', 'all', 'other', 'these', 'those', 'our', 'ours', 'his', 'her', 'hers', 'him', 'she', 'he', 'we',
  'us', 'as', 'at', 'by', 'of', 'on', 'in', 'to', 'or', 'if', 'be', 'do', 'does', 'did'
]);

const MAX_TEXT_CHARS = 5000;

function normalizeKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(text) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractConceptsFromText(text, { maxConcepts = 12 } = {}) {
  const clipped = String(text || '').slice(0, MAX_TEXT_CHARS);
  const tokens = clipped.match(/[a-zA-Z][a-zA-Z\-']{2,}/g) || [];

  const counts = new Map();
  for (const token of tokens) {
    const key = normalizeKey(token);
    if (!key || STOPWORDS.has(key)) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const ranked = Array.from(counts.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, maxConcepts)
    .map(([key, score]) => ({
      key,
      name: toTitleCase(key),
      score
    }));

  return {
    concepts: ranked,
    sentences: splitSentences(clipped)
  };
}

async function upsertConcept({ concept, testId, sourceType, sourceId, createdBy, snippet }) {
  const update = {
    $setOnInsert: {
      name: concept.name,
      key: concept.key,
      type: 'concept',
      testId,
      createdBy
    }
  };

  if (sourceType || sourceId || snippet) {
    update.$addToSet = {
      sources: {
        sourceType: sourceType || 'material',
        sourceId,
        snippet: snippet ? String(snippet).slice(0, 200) : ''
      }
    };
  }

  return KnowledgeNode.findOneAndUpdate(
    { key: concept.key, testId },
    update,
    { new: true, upsert: true }
  );
}

async function upsertEdge({ fromId, toId, testId, sourceType, sourceId, createdBy, snippet }) {
  const update = {
    $inc: { weight: 1 },
    $setOnInsert: { relation: 'RELATED_TO', testId, createdBy }
  };

  if (sourceType || sourceId || snippet) {
    update.$addToSet = {
      sources: {
        sourceType: sourceType || 'material',
        sourceId,
        snippet: snippet ? String(snippet).slice(0, 200) : ''
      }
    };
  }

  return KnowledgeEdge.updateOne(
    { from: fromId, to: toId, relation: 'RELATED_TO', testId },
    update,
    { upsert: true }
  );
}

async function addConceptsFromText({
  text,
  testId,
  sourceType = 'material',
  sourceId = null,
  createdBy = null,
  maxConcepts = 12
}) {
  const { concepts, sentences } = extractConceptsFromText(text, { maxConcepts });
  if (!concepts.length) return { concepts: [], edges: 0 };

  const nodes = await Promise.all(
    concepts.map((concept) =>
      upsertConcept({
        concept,
        testId,
        sourceType,
        sourceId,
        createdBy,
        snippet: text
      })
    )
  );

  const nodeMap = new Map(nodes.map((node) => [node.key, node]));
  let edgeCount = 0;

  for (const sentence of sentences) {
    const sentenceKey = normalizeKey(sentence);
    if (!sentenceKey) continue;

    const matched = concepts
      .filter((concept) => sentenceKey.includes(concept.key))
      .map((concept) => concept.key);

    if (matched.length < 2) continue;

    for (let i = 0; i < matched.length; i += 1) {
      for (let j = i + 1; j < matched.length; j += 1) {
        const left = nodeMap.get(matched[i]);
        const right = nodeMap.get(matched[j]);
        if (!left || !right) continue;

        const [fromId, toId] = left.key < right.key
          ? [left._id, right._id]
          : [right._id, left._id];

        await upsertEdge({
          fromId,
          toId,
          testId,
          sourceType,
          sourceId,
          createdBy,
          snippet: sentence
        });

        edgeCount += 1;
      }
    }
  }

  return { concepts: nodes, edges: edgeCount };
}

async function listConcepts({ testId, limit = 20, search = '' } = {}) {
  const filter = {};
  if (testId) filter.testId = testId;
  if (search) filter.key = { $regex: normalizeKey(search), $options: 'i' };

  return KnowledgeNode.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(100, Number(limit) || 20)))
    .lean();
}

async function getRelatedConcepts({ concept, testId, limit = 8 } = {}) {
  const key = normalizeKey(concept);
  if (!key) return [];

  const node = await KnowledgeNode.findOne({ key, testId }).lean();
  if (!node) return [];

  const edges = await KnowledgeEdge.find({
    testId,
    $or: [{ from: node._id }, { to: node._id }]
  })
    .sort({ weight: -1 })
    .limit(Math.max(1, Math.min(50, Number(limit) || 8)))
    .lean();

  const relatedIds = edges.map((edge) => (String(edge.from) === String(node._id)
    ? edge.to
    : edge.from
  ));

  if (!relatedIds.length) return [];

  const relatedNodes = await KnowledgeNode.find({ _id: { $in: relatedIds } }).lean();
  const nodeMap = new Map(relatedNodes.map((n) => [String(n._id), n]));

  return edges
    .map((edge) => {
      const otherId = String(edge.from) === String(node._id) ? edge.to : edge.from;
      return nodeMap.get(String(otherId));
    })
    .filter(Boolean);
}

async function getRelatedConceptsForText({ text, testId, limit = 8 } = {}) {
  const { concepts } = extractConceptsFromText(text, { maxConcepts: 5 });
  const related = new Map();

  for (const concept of concepts) {
    const nodes = await getRelatedConcepts({ concept: concept.key, testId, limit });
    for (const node of nodes) {
      related.set(node.key, node);
    }
  }

  return Array.from(related.values()).slice(0, limit);
}

async function getGraphSummary({ testId } = {}) {
  const nodeCount = await KnowledgeNode.countDocuments(testId ? { testId } : {});
  const edgeCount = await KnowledgeEdge.countDocuments(testId ? { testId } : {});
  const topConcepts = await KnowledgeNode.find(testId ? { testId } : {})
    .sort({ 'sources.length': -1, createdAt: -1 })
    .limit(10)
    .lean();

  return {
    nodeCount,
    edgeCount,
    topConcepts
  };
}

module.exports = {
  extractConceptsFromText,
  addConceptsFromText,
  listConcepts,
  getRelatedConcepts,
  getRelatedConceptsForText,
  getGraphSummary
};
