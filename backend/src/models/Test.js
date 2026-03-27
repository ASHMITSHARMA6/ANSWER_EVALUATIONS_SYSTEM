const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
}, { timestamps: true });

// Index for fast lookup
testSchema.index({ teacherId: 1, createdAt: -1 });
 
module.exports = mongoose.model('Test', testSchema);
