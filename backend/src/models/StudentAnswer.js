const mongoose = require('mongoose');

const studentAnswerSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  studentAnswer: { type: String, required: true },
  studentName: { type: String, default: 'Student' },
  originalFilename: { type: String, default: '' },
  batchId: { type: String, default: null },
  batchName: { type: String, default: null },
  status: {
    type: String,
    enum: ['uploaded', 'evaluated', 'failed'],
    default: 'uploaded'
  },
}, { timestamps: true });

module.exports = mongoose.model('StudentAnswer', studentAnswerSchema);
