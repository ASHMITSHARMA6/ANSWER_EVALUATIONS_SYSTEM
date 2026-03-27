/**
 * Deep-tune test: try many parameter combinations on the real scan
 * to find the best possible output from Tesseract.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const FILE = '/home/ansh/Downloads/Scan 01 Mar 26 21·14·10.pdf';

async function main() {
  // Convert PDF to high-res image
  const { execSync } = require('child_process');
  const tmpDir = '/tmp/ocr_deep_' + Date.now();
  fs.mkdirSync(tmpDir, { recursive: true });

  // Try 400 DPI instead of 300
  execSync(`pdftoppm -jpeg -r 400 "${FILE}" "${tmpDir}/page"`);
  const pageFile = fs.readdirSync(tmpDir).filter(f => /\.jpg$/i.test(f)).sort()[0];
  const imgPath = path.join(tmpDir, pageFile);
  const meta = await sharp(imgPath).metadata();
  console.log('Source image:', meta.width + 'x' + meta.height);

  const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY);

  const tests = [
    {
      name: 'normalise-only',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t1.png';
        await sharp(imgPath).grayscale().normalise().png().toFile(out);
        return out;
      }
    },
    {
      name: 'normalise+sharpen',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t2.png';
        await sharp(imgPath).grayscale().normalise().sharpen({ sigma: 2.0 }).png().toFile(out);
        return out;
      }
    },
    {
      name: 'high-contrast+thresh160',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t3.png';
        await sharp(imgPath).grayscale().linear(1.8, -50).threshold(160).png().toFile(out);
        return out;
      }
    },
    {
      name: 'high-contrast+thresh180',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t4.png';
        await sharp(imgPath).grayscale().linear(1.8, -50).threshold(180).png().toFile(out);
        return out;
      }
    },
    {
      name: 'normalise+thresh128',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t5.png';
        await sharp(imgPath).grayscale().normalise().threshold(128).png().toFile(out);
        return out;
      }
    },
    {
      name: 'clahe-like (normalise+linear)',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t6.png';
        await sharp(imgPath).grayscale().normalise().linear(1.5, -20).sharpen({ sigma: 1.5 }).png().toFile(out);
        return out;
      }
    },
    {
      name: 'upscale3x+normalise',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t7.png';
        await sharp(imgPath)
          .resize(meta.width * 3, meta.height * 3, { kernel: sharp.kernel.lanczos3 })
          .grayscale().normalise().png().toFile(out);
        return out;
      }
    },
    {
      name: 'normalise-AUTO-psm',
      psm: Tesseract.PSM.AUTO,
      preprocess: async () => {
        const out = tmpDir + '/t8.png';
        await sharp(imgPath).grayscale().normalise().png().toFile(out);
        return out;
      }
    },
    {
      name: 'normalise-SPARSE-psm',
      psm: Tesseract.PSM.SPARSE_TEXT,
      preprocess: async () => {
        const out = tmpDir + '/t9.png';
        await sharp(imgPath).grayscale().normalise().png().toFile(out);
        return out;
      }
    },
    {
      name: 'negate+normalise',
      psm: Tesseract.PSM.SINGLE_BLOCK,
      preprocess: async () => {
        const out = tmpDir + '/t10.png';
        await sharp(imgPath).grayscale().negate().normalise().sharpen({ sigma: 1 }).png().toFile(out);
        return out;
      }
    },
  ];

  let bestName = '';
  let bestText = '';
  let bestConf = 0;
  let bestWords = 0;

  for (const t of tests) {
    try {
      const imgFile = await t.preprocess();
      await worker.setParameters({ tessedit_pageseg_mode: t.psm, preserve_interword_spaces: '1' });
      const { data } = await worker.recognize(imgFile);
      const text = data.text.trim();
      const words = text.split(/\s+/).filter(w => w.length > 1).length;

      console.log(t.name.padEnd(30) + ' conf=' + data.confidence + '% chars=' + text.length + ' words=' + words);

      // For handwriting: prefer results with more recognisable words
      if (words > bestWords || (words === bestWords && data.confidence > bestConf)) {
        bestName = t.name;
        bestText = text;
        bestConf = data.confidence;
        bestWords = words;
      }
    } catch (err) {
      console.log(t.name + ': ERROR ' + err.message);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('BEST: ' + bestName + ' (conf=' + bestConf + '%, ' + bestText.length + ' chars, ' + bestWords + ' words)');
  console.log('═'.repeat(60));
  console.log(bestText);
  console.log('═'.repeat(60));

  await worker.terminate();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch(console.error);
