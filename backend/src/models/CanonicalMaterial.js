const mongoose = require('mongoose');

const canonicalMaterialSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'Canonical Material' },
  content: { type: String, required: true },
  contentHash: { type: String, required: true },
  sourceMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyMaterial' }
}, { timestamps: true });

canonicalMaterialSchema.index({ teacherId: 1, contentHash: 1 }, { unique: true });

module.exports = mongoose.model('CanonicalMaterial', canonicalMaterialSchema);
