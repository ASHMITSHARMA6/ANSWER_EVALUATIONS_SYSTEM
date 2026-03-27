/**
 * Chunk Model
 * Stores metadata about text chunks for retrieval reference
 */

const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 2000 },
  source: { type: String, required: true }, // materialId or answerId
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  section: { type: String, default: 'general' },
  order: { type: Number, default: 0 },
  startIdx: { type: Number, default: 0 },
  endIdx: { type: Number, default: 0 },
  length: { type: Number, default: 0 },
  isAnswer: { type: Boolean, default: false },
  questionId: { type: String }, // For answer chunks
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for faster queries
chunkSchema.index({ source: 1 });
chunkSchema.index({ userId: 1 });
chunkSchema.index({ questionId: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
