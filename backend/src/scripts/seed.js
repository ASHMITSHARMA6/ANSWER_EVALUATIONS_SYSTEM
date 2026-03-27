/**
 * Seed a teacher user for prototype. Run: node src/scripts/seed.js
 * Requires: MONGODB_URI, SEED_EMAIL, SEED_PASSWORD in .env (or defaults)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tes');
  const email = process.env.SEED_EMAIL || 'teacher@test.com';
  const password = process.env.SEED_PASSWORD || 'teacher123';
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Teacher already exists:', email);
    process.exit(0);
    return;
  }
  await User.create({ email, password });
  console.log('Created teacher:', email);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
