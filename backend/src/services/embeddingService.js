/**
 * Embedding Service
 * Generates vector embeddings using deterministic hash-based generator.
 * All stored material/answer embeddings use this approach for consistency.
 *
 * To upgrade: swap generateEmbeddingsImpl() with a real provider (e.g.
 * OpenAI text-embedding-3-small, Cohere embed-v3) and re-index material.
 */

const crypto = require('crypto');

const EMBEDDING_MODEL = 'deterministic-hash-384';
const EMBEDDING_DIMENSION = 384;

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
  const embeddings = generateEmbeddingsImpl([text]);
  return embeddings[0];
}

/**
 * Generate batch embeddings
 */
async function generateBatchEmbeddings(texts, batchSize = 10) {
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = generateEmbeddingsImpl(batch);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
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
