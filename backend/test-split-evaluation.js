/**
 * Split-answer evaluation harness
 *
 * Purpose:
 * - Take one full answer as model answer
 * - Create 4 derived student answers, each missing one key line
 * - Evaluate each variant and print detailed results
 *
 * Usage:
 *   npm run test:split-eval
 *   npm run test:split-eval -- --mode ai
 *   npm run test:split-eval -- --mode concept
 *   npm run test:split-eval -- --mode ai --delay-ms 1800 --file-delay-ms 3500 --retries 3
 *   npm run test:split-eval -- --file ./sample-answer.txt
 *   npm run test:split-eval -- --answer "line1\nline2\nline3\nline4"
 *   npm run test:split-eval -- --dir ./biology --out ./biology-split-eval-results.json
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const { evaluateAnswerWithRetrieval } = require('./src/services/aiService');


function parseArgs(argv) {
  const args = {
    file: '',
    answer: '',
    dir: '',
    out: '',
    mode: 'ai',
    delayMs: 1800,
    fileDelayMs: 3500,
    retries: 3
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--file' && argv[i + 1]) {
      args.file = argv[i + 1];
      i += 1;
    } else if (token === '--answer' && argv[i + 1]) {
      args.answer = argv[i + 1];
      i += 1;
    } else if (token === '--dir' && argv[i + 1]) {
      args.dir = argv[i + 1];
      i += 1;
    } else if (token === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    } else if (token === '--mode' && argv[i + 1]) {
      const value = String(argv[i + 1] || '').toLowerCase().trim();
      args.mode = (value === 'concept') ? 'concept' : 'ai';
      i += 1;
    } else if (token === '--concept') {
      args.mode = 'concept';
    } else if (token === '--ai') {
      args.mode = 'ai';
    } else if (token === '--delay-ms' && argv[i + 1]) {
      args.delayMs = Number(argv[i + 1]);
      i += 1;
    } else if (token === '--file-delay-ms' && argv[i + 1]) {
      args.fileDelayMs = Number(argv[i + 1]);
      i += 1;
    } else if (token === '--retries' && argv[i + 1]) {
      args.retries = Number(argv[i + 1]);
      i += 1;
    }
  }

  const clampInt = (value, fallback, max = 60000) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(max, Math.round(num)));
  };

  args.delayMs = clampInt(args.delayMs, 1800, 20000);
  args.fileDelayMs = clampInt(args.fileDelayMs, 3500, 60000);
  args.retries = clampInt(args.retries, 3, 8);

  if (args.mode === 'concept') {
    args.delayMs = 0;
    args.fileDelayMs = 0;
    args.retries = 0;
  }

  return args;
}

function sleep(ms) {
  const delay = Math.max(0, Number(ms) || 0);
  if (!delay) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function computeJitter(ms, pct = 0.2) {
  const base = Math.max(0, Number(ms) || 0);
  if (!base) return 0;
  const delta = Math.max(1, Math.round(base * pct));
  return Math.floor(Math.random() * delta);
}

function isHeuristicFallbackEvaluation(evaluation) {
  const feedback = String(evaluation?.feedback || '').toLowerCase();
  return feedback.includes('heuristic evaluation');
}

async function evaluateVariantWithRetry({
  question,
  retrievedChunks,
  answer,
  maxScore,
  rubric,
  mode,
  retries,
  delayMs
}) {
  const maxAttempts = 1 + Math.max(0, Number(retries) || 0);
  let lastEvaluation = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const evaluation = await evaluateAnswerWithRetrieval(
      question,
      retrievedChunks,
      answer,
      maxScore,
      rubric
    );
    lastEvaluation = evaluation;

    const heuristicFallback = mode === 'ai' && isHeuristicFallbackEvaluation(evaluation);
    if (!heuristicFallback) {
      return evaluation;
    }

    if (attempt < maxAttempts) {
      const backoff = (delayMs * attempt) + computeJitter(delayMs, 0.35);
      console.warn(`[Retry] AI fallback detected, retrying attempt ${attempt + 1}/${maxAttempts} after ${backoff}ms...`);
      await sleep(backoff);
    }
  }

  return lastEvaluation;
}

function resolvePath(target) {
  if (!target) return '';
  return path.isAbsolute(target) ? target : path.join(process.cwd(), target);
}

function loadFullAnswer({ file, answer }) {
  if (file) {
    const abs = resolvePath(file);
    return fs.readFileSync(abs, 'utf8').trim();
  }
  if (answer) return String(answer).trim();
  return DEFAULT_ANSWER;
}

function getTxtFilesInDir(dirArg) {
  const absDir = resolvePath(dirArg);
  if (!absDir || !fs.existsSync(absDir)) {
    throw new Error(`Directory not found: ${dirArg}`);
  }

  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const txtFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'))
    .map((entry) => path.join(absDir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  if (txtFiles.length === 0) {
    throw new Error(`No .txt files found in directory: ${absDir}`);
  }

  return txtFiles;
}

function splitLines(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pickMissingIndices(lines) {
  if (lines.length <= 4) {
    return lines.map((_, idx) => idx);
  }

  const candidates = [
    0,
    Math.floor((lines.length - 1) / 3),
    Math.floor((2 * (lines.length - 1)) / 3),
    lines.length - 1
  ];

  return Array.from(new Set(candidates)).slice(0, 4);
}

function buildConceptFirstRubric(lines, indices) {
  const selected = indices.map((idx) => lines[idx]).filter(Boolean);
  const conceptWeight = Number((25 / Math.max(1, selected.length)).toFixed(2));

  return {
    type: 'concept_first_v1',
    text: 'Auto-generated split-line test rubric',
    maxMarks: 25,
    requiredConcepts: selected.map((line) => ({
      concept: line,
      weight: conceptWeight,
      required: true,
      synonyms: [],
      depthLevels: {
        mention: Math.max(1, Number((conceptWeight * 0.35).toFixed(2))),
        explanation: Math.max(2, Number((conceptWeight * 0.65).toFixed(2))),
        linkage: conceptWeight
      }
    })),
    criticalErrors: []
  };
}

function makeVariants(lines, missingIndices) {
  return missingIndices.map((missingIdx, variantIndex) => {
    const variantLines = lines.filter((_, idx) => idx !== missingIdx);
    return {
      id: variantIndex + 1,
      missingLineIndex: missingIdx,
      missingLine: lines[missingIdx],
      answer: variantLines.join('\n')
    };
  });
}

function printHeader(fullAnswer, lineCount, variantsCount) {
  console.log('═'.repeat(80));
  console.log('SPLIT ANSWER EVALUATION HARNESS');
  console.log('═'.repeat(80));
  console.log(`Model answer lines: ${lineCount}`);
  console.log(`Generated variants: ${variantsCount}`);
  console.log('');
  console.log('Model answer:');
  console.log('-'.repeat(80));
  console.log(fullAnswer);
  console.log('-'.repeat(80));
  console.log('');
}

function printResult(result) {
  console.log(`Variant ${result.id}: missing line #${result.missingLineIndex + 1}`);
  console.log(`Missing line: ${result.missingLine}`);
  console.log(`Score: ${result.score}/${result.maxScore} (${result.percentage}%)`);
  console.log(`Matched concepts: ${result.matchedCount} | Missing concepts: ${result.missingCount}`);
  if (result.feedback) {
    console.log(`Feedback: ${result.feedback}`);
  }
  console.log('-'.repeat(80));
}

async function evaluateSingleModel({
  modelAnswer,
  sourceName,
  mode = 'ai',
  delayMs = 0,
  retries = 0
}) {
  if (!modelAnswer) {
    throw new Error(`Model answer is empty for: ${sourceName}`);
  }

  const lines = splitLines(modelAnswer);
  if (lines.length < 2) {
    throw new Error(`Need at least 2 non-empty lines in: ${sourceName}`);
  }

  const missingIndices = pickMissingIndices(lines);
  const conceptRubric = buildConceptFirstRubric(lines, missingIndices);
  const aiRubric = `Evaluate against the model answer with strict concept coverage.
Award marks for concept correctness, completeness, and contextual clarity.
Deduct for missing key ideas, factual mismatches, and weak explanation depth.
Return fair, concept-dependent marks (not fixed calibration).
Keep feedback concise (max 2 short sentences).`;
  const rubric = mode === 'concept' ? conceptRubric : aiRubric;
  const variants = makeVariants(lines, missingIndices);

  printHeader(modelAnswer, lines.length, variants.length);

  const question = 'Evaluate conceptual completeness against model answer.';
  const retrievedChunks = [{ text: modelAnswer, questionId: `split-test:${sourceName}` }];

  const results = [];
  for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
    const variant = variants[variantIndex];
    const evaluation = await evaluateVariantWithRetry({
      question,
      retrievedChunks,
      answer: variant.answer,
      maxScore: 25,
      rubric,
      mode,
      retries,
      delayMs
    });

    const rawScore = Number(evaluation?.score || 0);
    const maxScore = Number(evaluation?.max_score || 25);
    const score = Math.round(Math.max(0, Math.min(maxScore, rawScore)));
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const result = {
      ...variant,
      score,
      maxScore,
      percentage,
      matchedCount: Array.isArray(evaluation?.matched_concepts) ? evaluation.matched_concepts.length : 0,
      missingCount: Array.isArray(evaluation?.missing_concepts) ? evaluation.missing_concepts.length : 0,
      feedback: evaluation?.feedback || ''
    };

    results.push(result);
    printResult(result);

    if (mode === 'ai' && variantIndex < variants.length - 1 && delayMs > 0) {
      const waitFor = delayMs + computeJitter(delayMs, 0.15);
      console.log(`[Throttle] Waiting ${waitFor}ms before next variant...`);
      await sleep(waitFor);
    }
  }

  console.log('Summary ranking (highest to lowest):');
  const ranked = [...results].sort((a, b) => b.score - a.score);
  ranked.forEach((item, idx) => {
    console.log(`${idx + 1}. Variant ${item.id} -> ${item.score}/${item.maxScore}`);
  });
  console.log('═'.repeat(80));

  return {
    source: sourceName,
    evaluationMode: mode,
    lineCount: lines.length,
    variants: results,
    ranking: ranked.map((item) => ({
      variantId: item.id,
      score: item.score,
      maxScore: item.maxScore,
      percentage: item.percentage,
      missingLine: item.missingLine
    }))
  };
}

function writeResultsFile(outputPath, payload) {
  const absOut = resolvePath(outputPath || 'split-evaluation-results.json');
  fs.writeFileSync(absOut, JSON.stringify(payload, null, 2), 'utf8');
  return absOut;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  console.log(`[Config] mode=${args.mode} delayMs=${args.delayMs} fileDelayMs=${args.fileDelayMs} retries=${args.retries}`);

  if (args.dir) {
    const txtFiles = getTxtFilesInDir(args.dir);
    const allResults = [];

    console.log(`\nFound ${txtFiles.length} model answer .txt files in: ${resolvePath(args.dir)}\n`);

    for (let fileIndex = 0; fileIndex < txtFiles.length; fileIndex += 1) {
      const filePath = txtFiles[fileIndex];
      const modelAnswer = fs.readFileSync(filePath, 'utf8').trim();
      const sourceName = path.basename(filePath);
      console.log(`\nProcessing model answer file: ${sourceName}`);
      console.log('='.repeat(80));

      const fileResult = await evaluateSingleModel({
        modelAnswer,
        sourceName,
        mode: args.mode,
        delayMs: args.delayMs,
        retries: args.retries
      });
      allResults.push(fileResult);

      if (args.mode === 'ai' && fileIndex < txtFiles.length - 1 && args.fileDelayMs > 0) {
        const waitFor = args.fileDelayMs + computeJitter(args.fileDelayMs, 0.2);
        console.log(`[Throttle] Cooling down ${waitFor}ms before next file...`);
        await sleep(waitFor);
      }
    }

    const payload = {
      generatedAt,
      mode: 'directory',
      evaluationMode: args.mode,
      sourceDirectory: resolvePath(args.dir),
      fileCount: txtFiles.length,
      results: allResults
    };

    const outputPath = writeResultsFile(args.out || 'biology-split-evaluation-results.json', payload);
    console.log(`\nSaved batch results to: ${outputPath}`);
    return;
  }

  const fullAnswer = loadFullAnswer(args);
  if (!fullAnswer) {
    throw new Error('Full answer is empty. Provide --file, --answer, or --dir.');
  }

  const singleResult = await evaluateSingleModel({
    modelAnswer: fullAnswer,
    sourceName: args.file || 'inline/default',
    mode: args.mode,
    delayMs: args.delayMs,
    retries: args.retries
  });
  const payload = {
    generatedAt,
    mode: 'single',
    evaluationMode: args.mode,
    source: args.file || (args.answer ? 'inline' : 'default-sample'),
    result: singleResult
  };

  const outputPath = writeResultsFile(args.out || 'split-evaluation-results.json', payload);
  console.log(`Saved result to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Split evaluation script failed:', err.message);
  process.exit(1);
});
