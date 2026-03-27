/**
 * Vector Database Service
 * Handles FAISS in-memory indexing with persistent JSON backup
 * Ready for Pinecone integration (abstracted)
 */

const fs = require('fs');
const path = require('path');
const { EMBEDDING_DIMENSION } = require('./embeddingService');

const VECTOR_DB_FILE = path.join(__dirname, '../../data/vector_db.json');

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(VECTOR_DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// In-memory FAISS-like index (mock)
class SimpleVectorIndex {
  constructor(dimension = 384) {
    this.vectors = [];
    this.metadata = [];
    this.dimension = dimension;
  }

  add(vector, metadata) {
    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, got ${vector.length}`);
    }
    this.vectors.push(vector);
    this.metadata.push(metadata);
  }

  search(query, topK = 5) {
    if (query.length !== this.dimension) {
      throw new Error(`Query dimension mismatch. Expected ${this.dimension}, got ${query.length}`);
    }

    // Cosine similarity
    const similarities = this.vectors.map((v, idx) => ({
      idx,
      score: cosineSimilarity(query, v),
      metadata: this.metadata[idx]
    }));

    return similarities.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  delete(indices) {
    indices.sort((a, b) => b - a); // Delete from end to preserve indices
    indices.forEach(idx => {
      this.vectors.splice(idx, 1);
      this.metadata.splice(idx, 1);
    });
  }

  size() {
    return this.vectors.length;
  }

  toJSON() {
    return { vectors: this.vectors, metadata: this.metadata, dimension: this.dimension };
  }

  static fromJSON(data) {
    const idx = new SimpleVectorIndex(data.dimension);
    data.vectors.forEach((v, i) => {
      idx.vectors.push(v);
      idx.metadata.push(data.metadata[i]);
    });
    return idx;
  }
}

// Cosine similarity
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// Global indices
const indices = {
  material: null,
  answers: null
};

/**
 * Initialize vector DB indices
 */
function initializeVectorDB() {
  ensureDataDir();

  // Try to load from file
  if (fs.existsSync(VECTOR_DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(VECTOR_DB_FILE, 'utf8'));
      // Use EMBEDDING_DIMENSION from embeddingService (384-dim vectors)
      indices.material = SimpleVectorIndex.fromJSON(data.material || { vectors: [], metadata: [], dimension: EMBEDDING_DIMENSION });
      indices.answers = SimpleVectorIndex.fromJSON(data.answers || { vectors: [], metadata: [], dimension: EMBEDDING_DIMENSION });
      console.log('[VectorDB] Loaded from file:', {
        material: indices.material.size(),
        answers: indices.answers.size(),
        dimension: EMBEDDING_DIMENSION
      });
    } catch (err) {
      console.warn('[VectorDB] Failed to load from file, initializing fresh:', err.message);
      indices.material = new SimpleVectorIndex(EMBEDDING_DIMENSION);
      indices.answers = new SimpleVectorIndex(EMBEDDING_DIMENSION);
    }
  } else {
    indices.material = new SimpleVectorIndex(EMBEDDING_DIMENSION);
    indices.answers = new SimpleVectorIndex(EMBEDDING_DIMENSION);
    console.log('[VectorDB] Initialized fresh indices with dimension:', EMBEDDING_DIMENSION);
  }
}

/**
 * Save indices to disk
 */
function persistVectorDB() {
  try {
    ensureDataDir();
    const data = {
      material: indices.material.toJSON(),
      answers: indices.answers.toJSON(),
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(VECTOR_DB_FILE, JSON.stringify(data, null, 2));
    console.log('[VectorDB] Persisted to disk');
  } catch (err) {
    console.error('[VectorDB] Failed to persist:', err.message);
  }
}

/**
 * Add material embeddings to vector DB
 * @param {Array<number>} vectors - 1536-dim embedding vectors
 * @param {Array<Object>} metadata - Chunk metadata {text, source, section}
 */
function addMaterialEmbeddings(vectors, metadata) {
  if (vectors.length !== metadata.length) {
    throw new Error('Vectors and metadata length mismatch');
  }

  vectors.forEach((vec, idx) => {
    indices.material.add(vec, {
      ...metadata[idx],
      index: indices.material.size()
    });
  });

  persistVectorDB();
  console.log(`[VectorDB] Added ${vectors.length} material embeddings. Total: ${indices.material.size()}`);
}

/**
 * Add answer embeddings to vector DB
 * @param {Array<number>} vectors - 1536-dim embedding vectors
 * @param {Array<Object>} metadata - Answer metadata {text, questionId, maxScore}
 */
function addAnswerEmbeddings(vectors, metadata) {
  if (vectors.length !== metadata.length) {
    throw new Error('Vectors and metadata length mismatch');
  }

  vectors.forEach((vec, idx) => {
    indices.answers.add(vec, {
      ...metadata[idx],
      index: indices.answers.size()
    });
  });

  persistVectorDB();
  console.log(`[VectorDB] Added ${vectors.length} answer embeddings. Total: ${indices.answers.size()}`);
}

/**
 * Query material embeddings
 * @param {Array<number>} queryVector - Query embedding
 * @param {number} topK - Number of results
 * @returns {Array<{score, text, source, section}>}
 */
function queryMaterial(queryVector, topK = 5, testId = null) {
  const results = indices.material.search(queryVector, topK * 4);
  const filtered = testId
    ? results.filter(r => String(r.metadata.testId || '') === String(testId))
    : results;

  return filtered.slice(0, topK).map(r => ({
    score: r.score,
    text: r.metadata.text,
    source: r.metadata.source,
    section: r.metadata.section || 'general',
    index: r.idx
  }));
}

/**
 * Query answer embeddings
 * @param {Array<number>} queryVector - Query embedding
 * @param {number} topK - Number of results
 * @returns {Array<{score, text, questionId, maxScore}>}
 */
function queryAnswers(queryVector, topK = 5, testId = null) {
  const results = indices.answers.search(queryVector, topK * 4);
  const filtered = testId
    ? results.filter(r => String(r.metadata.testId || '') === String(testId))
    : results;

  return filtered.slice(0, topK).map(r => ({
    score: r.score,
    text: r.metadata.text,
    questionId: r.metadata.questionId,
    maxScore: r.metadata.maxScore,
    index: r.idx
  }));
}

/**
 * Get index statistics
 */
function getStats() {
  return {
    material: {
      size: indices.material.size(),
      dimension: indices.material.dimension
    },
    answers: {
      size: indices.answers.size(),
      dimension: indices.answers.dimension
    },
    dataFile: VECTOR_DB_FILE,
    fileExists: fs.existsSync(VECTOR_DB_FILE)
  };
}

/**
 * Clear all indices (for testing)
 */
function clear() {
  indices.material = new SimpleVectorIndex(EMBEDDING_DIMENSION);
  indices.answers = new SimpleVectorIndex(EMBEDDING_DIMENSION);
  persistVectorDB();
  console.log('[VectorDB] Cleared all indices');
}

module.exports = {
  initializeVectorDB,
  persistVectorDB,
  addMaterialEmbeddings,
  addAnswerEmbeddings,
  queryMaterial,
  queryAnswers,
  getStats,
  clear
};
