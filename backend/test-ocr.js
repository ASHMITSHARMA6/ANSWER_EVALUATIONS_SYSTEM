/**
 * Test Tesseract.js OCR
 * Run: node test-ocr.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createTestImage() {
  // Create a simple test image with white background and black text-like marks
  // This simulates a basic handwritten answer sheet
  const width = 800;
  const height = 400;

  // Create SVG with text (simulates printed/handwritten text)
  const svgText = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <text x="50" y="80" font-family="serif" font-size="36" fill="black">Hello World</text>
    <text x="50" y="140" font-family="serif" font-size="30" fill="black">This is a test of OCR</text>
    <text x="50" y="200" font-family="serif" font-size="30" fill="black">Tesseract can read this text</text>
    <text x="50" y="260" font-family="serif" font-size="28" fill="black">The quick brown fox jumps</text>
    <text x="50" y="320" font-family="serif" font-size="28" fill="black">over the lazy dog</text>
  </svg>`;

  const testFile = path.join(__dirname, 'uploads/handwritten/test_ocr.png');
  fs.mkdirSync(path.dirname(testFile), { recursive: true });

  await sharp(Buffer.from(svgText)).png().toFile(testFile);
  console.log('Created test image: ' + testFile);
  return testFile;
}

async function main() {
  console.log('=== Tesseract.js OCR Test ===\n');
  console.log('No API key needed! Runs 100% locally.\n');

  const ocrService = require('./src/services/ocrService');

  // Create test image
  const testFile = await createTestImage();

  // Test OCR
  console.log('\nRunning OCR on test image...\n');
  const startTime = Date.now();

  try {
    const text = await ocrService.extractTextFromImage(testFile);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n========== RESULTS ==========');
    console.log('Extracted text:');
    console.log('---');
    console.log(text);
    console.log('---');
    console.log('Characters: ' + text.length);
    console.log('Time: ' + elapsed + 's');
    console.log('=============================\n');

    if (text.length > 10) {
      console.log('SUCCESS! Tesseract.js OCR is working!');
    } else {
      console.log('WARNING: Very little text extracted. OCR may need tuning.');
    }
  } catch (err) {
    console.error('ERROR: ' + err.message);
  }

  // Cleanup
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  await ocrService.cleanup();
  console.log('\nTest complete.');
}

main().catch(console.error);
