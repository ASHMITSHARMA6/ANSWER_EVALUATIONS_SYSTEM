const mongoose = require('mongoose');

const knowledgeNodeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, trim: true, lowercase: true },
  type: { type: String, enum: ['concept', 'topic', 'entity'], default: 'concept' },
  description: { type: String, default: '' },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  sources: [
    {
      sourceType: {
        type: String,
        enum: ['material', 'model_answer', 'question', 'student_answer', 'manual'],
        default: 'material'
      },
      sourceId: { type: mongoose.Schema.Types.ObjectId },
      snippet: { type: String, default: '' }
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

knowledgeNodeSchema.index(
  { key: 1, testId: 1 },
  { unique: true, partialFilterExpression: { key: { $exists: true }, testId: { $exists: true } } }
);
knowledgeNodeSchema.index({ testId: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeNode', knowledgeNodeSchema);
