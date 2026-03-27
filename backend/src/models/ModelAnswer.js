const mongoose = require('mongoose');

const modelAnswerSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  questionText: { type: String, default: '' },
  modelAnswer: { type: String, required: true },
  maxMarks: { type: Number, required: true, min: 1 },
}, { timestamps: true });

module.exports = mongoose.model('ModelAnswer', modelAnswerSchema);
