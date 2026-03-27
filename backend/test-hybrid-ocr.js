/**
 * Test the hybrid OCR (Groq Vision + Tesseract fallback) on real scan
 */
require('dotenv').config();
const ocrService = require('./src/services/ocrService');

const FILE = '/home/ansh/Downloads/Scan 01 Mar 26 21·14·10.pdf';

async function main() {
  console.log('=== Hybrid OCR Test (Groq Vision + Tesseract Fallback) ===\n');
  console.log('File: ' + FILE);
  const start = Date.now();

  try {
    const text = await ocrService.extractText(FILE);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log('\n' + '═'.repeat(60));
    console.log('EXTRACTED TEXT (' + text.length + ' chars, ' + elapsed + 's):');
    console.log('═'.repeat(60));
    console.log(text);
    console.log('═'.repeat(60));
  } catch (err) {
    console.error('ERROR:', err.message);
  }

  await ocrService.cleanup();
  process.exit(0);
}

main();
