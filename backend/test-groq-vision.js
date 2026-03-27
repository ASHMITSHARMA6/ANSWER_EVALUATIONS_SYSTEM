/**
 * Quick test: Can Groq Vision (free) read the handwritten scan?
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const FILE = '/home/ansh/Downloads/Scan 01 Mar 26 21·14·10.pdf';

async function main() {
  if (!GROQ_API_KEY) {
    console.error('No GROQ_API_KEY in .env');
    process.exit(1);
  }

  // Convert PDF page to JPEG
  const tmpDir = '/tmp/groq_ocr_test_' + Date.now();
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(`pdftoppm -jpeg -r 300 "${FILE}" "${tmpDir}/page"`);
  const pageFile = fs.readdirSync(tmpDir).filter(f => /\.jpg$/i.test(f)).sort()[0];
  const imgPath = path.join(tmpDir, pageFile);

  // Read image as base64
  const imageBuffer = fs.readFileSync(imgPath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg';

  console.log('Image size:', (imageBuffer.length / 1024).toFixed(0) + 'KB');
  console.log('Calling Groq Vision API (llama-4-scout)...\n');

  const start = Date.now();

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GROQ_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please read and transcribe ALL the handwritten text in this image exactly as written. Include every word, sentence, and paragraph. Do not summarize or interpret — just transcribe the handwriting faithfully. If you cannot read a word clearly, write [unclear] in its place.',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'data:' + mimeType + ';base64,' + base64Image,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const data = await response.json();

  if (data.error) {
    console.error('Groq API error:', JSON.stringify(data.error, null, 2));
  } else {
    const text = data.choices[0].message.content;
    console.log('═'.repeat(60));
    console.log('GROQ VISION OUTPUT (' + text.length + ' chars, ' + elapsed + 's):');
    console.log('═'.repeat(60));
    console.log(text);
    console.log('═'.repeat(60));
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch(console.error);
