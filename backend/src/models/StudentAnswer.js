const mongoose = require('mongoose');

const studentAnswerSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  studentAnswer: { type: String, required: true },
  studentName: { type: String, default: 'Student' },
}, { timestamps: true });

module.exports = mongoose.model('StudentAnswer', studentAnswerSchema);
