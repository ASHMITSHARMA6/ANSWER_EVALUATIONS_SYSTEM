/**
 * Compare all strategy outputs side by side for the scanned PDF
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const FILE = '/home/ansh/Downloads/Scan 01 Mar 26 21·14·10.pdf';

async function main() {
  // Convert PDF to image first
  const { execSync } = require('child_process');
  const tmpDir = '/tmp/ocr_compare_' + Date.now();
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(`pdftoppm -jpeg -r 300 "${FILE}" "${tmpDir}/page"`);

  const pageFile = fs.readdirSync(tmpDir)
    .filter(f => /\.(jpg|jpeg)$/i.test(f))
    .sort()[0];
  const imgPath = path.join(tmpDir, pageFile);
  console.log('Page image:', imgPath);

  // Create worker
  const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY);
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    preserve_interword_spaces: '1',
  });

  // Strategy: gentle (normalise / adaptive)
  const meta = await sharp(imgPath).metadata();
  const TARGET = 2000;
  const shortest = Math.min(meta.width, meta.height);
  const scale = shortest < TARGET ? Math.min(4, TARGET / shortest) : 1;
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);

  const gentlePath = tmpDir + '/gentle.png';
  await sharp(imgPath)
    .resize(w, h, { kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
    .grayscale()
    .linear(1.15, 0)
    .sharpen({ sigma: 0.8 })
    .normalise()
    .png()
    .toFile(gentlePath);

  const { data: gentleData } = await worker.recognize(gentlePath);
  console.log('\n' + '═'.repeat(60));
  console.log('GENTLE (conf=' + gentleData.confidence + '%, ' + gentleData.text.trim().length + ' chars):');
  console.log('═'.repeat(60));
  console.log(gentleData.text.trim());

  // Strategy: raw (just grayscale + upscale)
  const rawPath = tmpDir + '/raw.png';
  await sharp(imgPath)
    .resize(w, h, { kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
    .grayscale()
    .png()
    .toFile(rawPath);

  const { data: rawData } = await worker.recognize(rawPath);
  console.log('\n' + '═'.repeat(60));
  console.log('RAW (conf=' + rawData.confidence + '%, ' + rawData.text.trim().length + ' chars):');
  console.log('═'.repeat(60));
  console.log(rawData.text.trim());

  await worker.terminate();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch(console.error);
