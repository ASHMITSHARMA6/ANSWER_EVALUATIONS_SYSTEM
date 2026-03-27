const mongoose = require('mongoose');

const questionSetSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyMaterial' },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  questions: [{ type: String }],
  modelAnswers: [{ type: String }],
  difficulty: { type: String, default: 'medium' },
  customPrompt: { type: String },
  retrievedChunkCount: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('QuestionSet', questionSetSchema);
