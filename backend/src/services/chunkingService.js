/**
 * Chunking Service
 * Splits text into semantically meaningful chunks with overlap
 * Optimized for Q&A evaluation use case
 */

/**
 * Split text into sentences intelligently
 */
function sentenceTokenize(text) {
  // Split on periods, exclamation marks, question marks
  // But preserve them and handle edge cases (abbreviations, decimals)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * Chunk text with sliding window
 * @param {string} text - Input text
 * @param {number} chunkSize - Number of sentences per chunk
 * @param {number} overlap - Number of sentences to overlap
 * @returns {Array<{text, startIdx, endIdx}>}
 */
function createChunks(text, chunkSize = 3, overlap = 1) {
  const sentences = sentenceTokenize(text);
  const chunks = [];

  if (sentences.length === 0) {
    return [];
  }

  // If text is short, return as single chunk
  if (sentences.length <= chunkSize) {
    return [{
      text: sentences.join(' '),
      startIdx: 0,
      endIdx: sentences.length - 1
    }];
  }

  // Sliding window chunking
  for (let i = 0; i < sentences.length; i += (chunkSize - overlap)) {
    const end = Math.min(i + chunkSize, sentences.length);
    const chunk = sentences.slice(i, end).join(' ');

    chunks.push({
      text: chunk,
      startIdx: i,
      endIdx: end - 1
    });

    // Stop if we've reached the end
    if (end === sentences.length) break;
  }

  return chunks;
}

/**
 * Preprocess text for better chunking
 */
function preprocessText(text) {
  if (!text || typeof text !== 'string') return '';

  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Remove common artifacts
  text = text.replace(/page\s+\d+/gi, ''); // Remove page numbers
  text = text.replace(/\s*\n\s*/g, ' '); // Remove newlines

  return text;
}

/**
 * Split text into chunks optimized for QA
 * Returns chunks with metadata
 */
function chunkTextForQA(text, source = 'material') {
  text = preprocessText(text);
  const rawChunks = createChunks(text, chunkSize = 4, overlap = 1);

  return rawChunks.map((chunk, idx) => ({
    text: chunk.text,
    source,
    section: `chunk_${idx + 1}`,
    startIdx: chunk.startIdx,
    endIdx: chunk.endIdx,
    order: idx,
    length: chunk.text.length
  }));
}

/**
 * Split answer text (usually shorter) into chunks
 */
function chunkAnswerForEvaluation(text, questionId, source = 'model_answer') {
  text = preprocessText(text);
  
  // For answers, use larger chunks (usually 1-2 chunks per answer)
  const rawChunks = createChunks(text, chunkSize = 5, overlap = 0);

  return rawChunks.map((chunk, idx) => ({
    text: chunk.text,
    source,
    questionId,
    section: `answer_chunk_${idx + 1}`,
    startIdx: chunk.startIdx,
    endIdx: chunk.endIdx,
    order: idx,
    length: chunk.text.length,
    isAnswer: true
  }));
}

/**
 * Validate chunk quality (filter out too-short chunks)
 */
function filterChunks(chunks, minLength = 30) {
  return chunks.filter(chunk => chunk.text.length >= minLength);
}

/**
 * Get chunk statistics for debugging
 */
function getChunkStats(chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      totalChunks: 0,
      avgLength: 0,
      minLength: 0,
      maxLength: 0,
      totalLength: 0
    };
  }

  const lengths = chunks.map(c => c.text.length);
  return {
    totalChunks: chunks.length,
    avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / chunks.length),
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    totalLength: lengths.reduce((a, b) => a + b, 0)
  };
}

module.exports = {
  sentenceTokenize,
  createChunks,
  preprocessText,
  chunkTextForQA,
  chunkAnswerForEvaluation,
  filterChunks,
  getChunkStats
};
