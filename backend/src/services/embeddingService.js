/**
 * Embedding Service
 * Generates vector embeddings using deterministic hash-based generator.
 * All stored material/answer embeddings use this approach for consistency.
 *
 * To upgrade: swap generateEmbeddingsImpl() with a real provider (e.g.
 * OpenAI text-embedding-3-small, Cohere embed-v3) and re-index material.
 */

const crypto = require('crypto');
const cacheService = require('./cacheService');

const EMBEDDING_MODEL = 'deterministic-hash-384';
const EMBEDDING_DIMENSION = 384;
const EMBEDDING_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Deterministic embedding generator
 * Produces reproducible 384-dim vectors from text via SHA-256 hashing.
 * All existing stored embeddings use this function, so switching to a
 * real model requires re-indexing the vector DB.
 */
function mockEmbedding(text) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vector = new Array(EMBEDDING_DIMENSION);

  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    // Use hash bytes cyclically to generate pseudo-random values between -1 and 1
    const byte = hash[i % hash.length];
    vector[i] = (byte / 255) * 2 - 1; // Normalize to [-1, 1]
  }

  return vector;
}

/**
 * Core implementation — generates embeddings for an array of texts
 */
function generateEmbeddingsImpl(texts) {
  return texts.map(text => mockEmbedding(text));
}

/**
 * Generate single embedding
 */
async function generateEmbedding(text) {
  const safeText = String(text || '');
  const cacheKey = `embed:${crypto.createHash('sha1').update(safeText).digest('hex')}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const embeddings = generateEmbeddingsImpl([safeText]);
  cacheService.set(cacheKey, embeddings[0], EMBEDDING_CACHE_TTL_MS);
  return embeddings[0];
}

/**
 * Generate batch embeddings
 */
async function generateBatchEmbeddings(texts, batchSize = 10) {
  const safeTexts = Array.isArray(texts) ? texts.map((t) => String(t || '')) : [];
  const results = new Array(safeTexts.length);
  const missing = [];

  safeTexts.forEach((text, index) => {
    const cacheKey = `embed:${crypto.createHash('sha1').update(text).digest('hex')}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      results[index] = cached;
    } else {
      missing.push({ text, index, cacheKey });
    }
  });

  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize);
    const embeddings = generateEmbeddingsImpl(batch.map((item) => item.text));
    embeddings.forEach((embedding, idx) => {
      const item = batch[idx];
      results[item.index] = embedding;
      cacheService.set(item.cacheKey, embedding, EMBEDDING_CACHE_TTL_MS);
    });
  }

  return results;
}

/**
 * Get embedding info (for debugging)
 */
function getEmbeddingInfo() {
  return {
    model: EMBEDDING_MODEL,
    dimension: EMBEDDING_DIMENSION,
    provider: 'Deterministic Hash',
  };
}

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings,
  mockEmbedding,
  getEmbeddingInfo,
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL
};
