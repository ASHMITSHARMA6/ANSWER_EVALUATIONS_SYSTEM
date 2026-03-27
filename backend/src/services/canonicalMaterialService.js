const crypto = require('crypto');
const CanonicalMaterial = require('../models/CanonicalMaterial');

const normalizeContent = (content) => (content || '').trim();

const hashContent = (content) => {
  const normalized = normalizeContent(content);
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const getOrCreateCanonicalMaterial = async ({ teacherId, content, title, sourceMaterialId }) => {
  const normalized = normalizeContent(content);
  const contentHash = hashContent(normalized);

  const existing = await CanonicalMaterial.findOne({ teacherId, contentHash }).lean();
  if (existing) {
    return existing;
  }

  const created = await CanonicalMaterial.create({
    teacherId,
    title: title || 'Canonical Material',
    content: normalized,
    contentHash,
    sourceMaterialId
  });

  return created.toObject();
};

module.exports = {
  normalizeContent,
  hashContent,
  getOrCreateCanonicalMaterial
};
