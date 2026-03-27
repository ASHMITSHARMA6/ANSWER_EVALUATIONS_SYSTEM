const mongoose = require('mongoose');

const evaluationResultSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  studentName: { type: String, default: 'Student' },
  questionText: { type: String, default: '' },
  modelAnswer: { type: String },
  studentAnswer: { type: String },
  marks: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  
  // Batch processing
  batchId: { type: String, default: null }, // Groups results from same batch upload
  batchName: { type: String, default: null },
  
  // Vector-based evaluation fields
  matchedConcepts: [{ type: String }],
  missingConcepts: [{ type: String }],
  feedback: { type: String, default: '' },
  retrievedChunkCount: { type: Number, default: 0 },
  evaluationMethod: { 
    type: String, 
    enum: ['vector_retrieval_llm', 'legacy_direct_llm', 'fallback_keyword'],
    default: 'vector_retrieval_llm'
  },

  // Marking scheme integration
  markingSchemeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MarkingScheme'
  },
  marksBreakdown: {
    total: { type: Number },
    key_concepts: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 }
  },
}, { timestamps: true });

// Index for fast queries
evaluationResultSchema.index({ teacherId: 1, createdAt: -1 });
evaluationResultSchema.index({ markingSchemeId: 1 });
evaluationResultSchema.index({ batchId: 1 });

module.exports = mongoose.model('EvaluationResult', evaluationResultSchema);
