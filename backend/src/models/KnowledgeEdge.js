const mongoose = require('mongoose');

const knowledgeEdgeSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeNode', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeNode', required: true },
  relation: { type: String, default: 'RELATED_TO' },
  weight: { type: Number, default: 1 },
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

knowledgeEdgeSchema.index({ from: 1, to: 1, relation: 1, testId: 1 }, { unique: true });
knowledgeEdgeSchema.index({ testId: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeEdge', knowledgeEdgeSchema);
