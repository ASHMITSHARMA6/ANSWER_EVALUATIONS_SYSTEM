const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
  canonicalMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'CanonicalMaterial' },
  content: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
