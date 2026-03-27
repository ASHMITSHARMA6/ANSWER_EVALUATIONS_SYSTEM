/**
 * Test the improved multi-strategy OCR engine.
 * Creates a synthetic handwriting-style image and measures recognition quality.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ocrService = require('./src/services/ocrService');

const UPLOADS = path.join(__dirname, 'uploads', 'handwritten');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

async function createTestImage() {
  // Create a realistic handwriting-like test image:
  // Dark grey text on slightly off-white background with slight noise
  const width = 800;
  const height = 400;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f0e8"/>
      <line x1="0" y1="80"  x2="800" y2="80"  stroke="#c0c0c0" stroke-width="1"/>
      <line x1="0" y1="160" x2="800" y2="160" stroke="#c0c0c0" stroke-width="1"/>
      <line x1="0" y1="240" x2="800" y2="240" stroke="#c0c0c0" stroke-width="1"/>
      <line x1="0" y1="320" x2="800" y2="320" stroke="#c0c0c0" stroke-width="1"/>
      <text x="40" y="70"  font-family="serif" font-size="28" fill="#1a1a3a"
            style="font-style:italic" transform="rotate(-1, 40, 70)">
        The process of photosynthesis converts</text>
      <text x="40" y="150" font-family="serif" font-size="28" fill="#1a1a3a"
            style="font-style:italic" transform="rotate(0.5, 40, 150)">
        sunlight into chemical energy. Plants</text>
      <text x="40" y="230" font-family="serif" font-size="28" fill="#2a2a4a"
            style="font-style:italic" transform="rotate(-0.5, 40, 230)">
        absorb carbon dioxide and water to</text>
      <text x="40" y="310" font-family="serif" font-size="28" fill="#1a1a3a"
            style="font-style:italic" transform="rotate(0.8, 40, 310)">
        produce glucose and oxygen molecules.</text>
    </svg>`;

  const imgPath = path.join(UPLOADS, 'test_handwriting.png');

  // Render SVG, then add slight blur to simulate pen bleeding
  await sharp(Buffer.from(svg))
    .png()
    .blur(0.5)
    .toFile(imgPath);

  console.log('Created test image: ' + imgPath);
  return imgPath;
}

async function runTest() {
  console.log('=== Multi-Strategy OCR Test ===\n');

  const imgPath = await createTestImage();
  const start = Date.now();

  try {
    const text = await ocrService.extractText(imgPath);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log('\n─── RESULT ───');
    console.log('Time:  ' + elapsed + 's');
    console.log('Text:  "' + text + '"');
    console.log('Len:   ' + text.length + ' characters');

    // Check expected keywords
    const expected = ['photosynthesis', 'sunlight', 'chemical', 'energy',
      'carbon dioxide', 'water', 'glucose', 'oxygen'];
    const found = expected.filter(w => text.toLowerCase().includes(w));
    console.log('Keywords found: ' + found.length + '/' + expected.length +
      ' (' + found.join(', ') + ')');

    if (found.length >= 5) {
      console.log('\n✅ GOOD — OCR recognised most content');
    } else if (found.length >= 3) {
      console.log('\n⚠️  PARTIAL — some content recognised');
    } else {
      console.log('\n❌ POOR — OCR struggled with this image');
    }
  } catch (err) {
    console.error('Test failed:', err.message);
  }

  await ocrService.cleanup();
  process.exit(0);
}

runTest();
