/**
 * AI Service - Groq API Only
 * Question generation and answer evaluation with vector DB retrieval
 * 
 * CORE PRINCIPLE:
 * - LLM is ONLY called after vector DB retrieves relevant context
 * - LLM CANNOT use external knowledge
 * - Answers evaluated STRICTLY on retrieved model-answer context
 */

const axios = require('axios');

// ===== GROQ CONFIG =====
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Updated: gemma-7b-it decommissioned, using llama-3.1-8b-instant

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryDelayMs = (errorMessage = '') => {
  const match = String(errorMessage).match(/try again in\s*([0-9.]+)s/i);
  if (!match) return 15000;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds)) return 15000;
  return Math.min(30000, Math.max(3000, Math.round(seconds * 1000)));
};

// Verify API key on startup
if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
  console.error('[AI] ❌ ERROR: GROQ_API_KEY not set in .env file!');
  console.error('[AI] Get a free key from: https://console.groq.com');
}

/**
 * Call Groq API for text generation
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User message
 * @param {number} temperature - 0 (deterministic) to 2 (creative)
 * @returns {Promise<string|null>} Model response or null
 */
async function callGroqAPI(systemPrompt, userPrompt, temperature = 0.7) {
  if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
    console.error('[AI] ❌ GROQ_API_KEY not configured');
    return null;
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      console.log('[AI] 🚀 Calling Groq API...');
      console.log(`[AI] Model: ${GROQ_MODEL}`);

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: Math.max(0, Math.min(2, temperature)),
          max_tokens: 2000,
          top_p: 1
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || '';

      if (content) {
        console.log('[AI] ✅ Groq API call successful');
        console.log(`[AI] Response length: ${content.length} characters`);
        return content;
      }

      console.warn('[AI] ⚠️ Empty response from Groq API');
      return null;
    } catch (error) {
      const status = error.response?.status;
      const retryDelayMs = parseRetryDelayMs(error.response?.data?.error?.message || error.message);
      console.error('[AI] ❌ Groq API Error:', {
        status,
        message: error.message,
        data: error.response?.data
      });

      if (status === 429 && attempt === 1) {
        console.warn(`[AI] ⏳ Rate limited. Retrying after ${Math.round(retryDelayMs / 1000)}s...`);
        await sleep(retryDelayMs);
        continue;
      }
      return null;
    }
  }

  return null;
}


// ============================================================
// QUESTION GENERATION (with vector retrieval)
// ============================================================

const QUESTION_GEN_SYSTEM = `You are an expert academic question paper generator creating clear, well-structured exam questions.

CRITICAL REQUIREMENTS:
1. ✅ Generate questions ONLY from the provided study material - NO external knowledge
2. ✅ Make questions CLEAR, SPECIFIC, and DIRECTLY answerable from the material
3. ✅ Each question must have ONE clear focus (not vague or multi-part without structure)
4. ✅ Use proper grammar and academic language
5. ✅ Difficulty levels:
   - easy: Direct recall, definitions, facts mentioned explicitly in material (Who, What, Define, List)
   - medium: Understanding relationships, explaining concepts, simple application (Explain, Describe, How)
   - hard: Analysis, comparison, synthesis of multiple ideas, critical evaluation (Analyze, Compare, Evaluate)
6. ✅ Vary question types: definition, short-answer, essay, explanation, analysis, comparison
7. ✅ Make questions 1-3 sentences maximum for clarity
8. ✅ Output ONLY a valid JSON array of question strings - nothing else
9. ✅ Example: ["What is X?", "How does Y work?", "Compare A and B", "Why is Z important?"]
10. ✅ NO text before or after the JSON array.`;

const MODEL_ANSWER_SYSTEM = `You are an expert teacher writing concise, high-quality model answers.

CRITICAL REQUIREMENTS:
1. ✅ Use ONLY the provided study material context - NO external knowledge
2. ✅ Answer each question directly and clearly
3. ✅ Keep answers concise (2-6 sentences unless question demands more)
4. ✅ If context is partial, provide the best possible answer from available material and explicitly mention the missing part in one short sentence.
5. ✅ Output ONLY a valid JSON array of answer strings - nothing else
6. ✅ NO text before or after the JSON array.`;

const ANSWER_PLACEHOLDER_RE = /not enough information in the provided material\.?/i;
const ANSWER_STOPWORDS = new Set([
  'what', 'which', 'where', 'when', 'why', 'how', 'write', 'about', 'tell', 'explain', 'describe',
  'define', 'discuss', 'compare', 'contrast', 'list', 'the', 'and', 'for', 'with', 'that', 'this', 'from',
  'into', 'their', 'there', 'have', 'has', 'had', 'been', 'were', 'was', 'are', 'is', 'its', 'your', 'them',
  'than', 'but', 'not', 'can', 'could', 'should', 'would', 'may', 'might', 'will', 'shall', 'also', 'only',
  'such', 'most', 'more', 'less', 'some', 'any', 'each', 'all', 'other', 'these', 'those', 'our', 'ours',
  'his', 'her', 'hers', 'him', 'she', 'he', 'we', 'us', 'as', 'at', 'by', 'of', 'on', 'in', 'to', 'or', 'if',
  'be', 'do', 'does', 'did', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'
]);

function buildQuestionPrompt(
  retrievedMaterialChunks,
  difficulty = 'medium',
  count = 5,
  customPrompt = '',
  avoidQuestions = [],
  variationToken = ''
) {
  const material = retrievedMaterialChunks.map(c => c.text).join('\n\n');

  let prompt = `STUDY MATERIAL (your ONLY information source):
═════════════════════════════════════════════════════
${material}
═════════════════════════════════════════════════════

TASK: Generate exactly ${count} CLEAR, SPECIFIC questions from ONLY the above material.

DIFFICULTY LEVEL: ${difficulty.toUpperCase()}
- easy: Direct recall questions (What is..., Define..., List...)
- medium: Understanding questions (Explain how..., What is the relationship...)
- hard: Analysis questions (Analyze why..., Compare... and discuss...)`;

  if (customPrompt && customPrompt.trim()) {
    prompt += `

USER'S SPECIFIC FOCUS AREA:
"${customPrompt}"

Generate questions specifically focused on this topic from the material above.`;
  }

  if (Array.isArray(avoidQuestions) && avoidQuestions.length) {
    const avoidList = avoidQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    prompt += `

AVOID REPEATING THESE QUESTIONS:
${avoidList}

Ensure all generated questions are NEW and not paraphrases of the list above.`;
  }

  if (variationToken) {
    prompt += `

Generation token (use to diversify output, do not include in questions): ${variationToken}`;
  }

  prompt += `

OUTPUT FORMAT:
Return ONLY a JSON array with exactly ${count} questions.
Example: ["What is X?", "How does Y work?", "Compare A and B"]
NO text before or after.`;

  return prompt;
}

function buildModelAnswerPrompt(retrievedMaterialChunks, questions) {
  const material = retrievedMaterialChunks
    .map((chunk, i) => `CHUNK ${i + 1}:\n${chunk.text}`)
    .join('\n\n---\n\n');

  return `STUDY MATERIAL CONTEXT (USE ONLY THIS):
${material}

QUESTIONS:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

OUTPUT FORMAT:
Return ONLY a JSON array with exactly ${questions.length} answers, in the same order as the questions.
Example: ["Answer 1...", "Answer 2..."]
NO text before or after.`;
}

function parseModelAnswersFallback(rawText, expectedCount) {
  const cleaned = String(rawText || '').trim();
  if (!cleaned) return [];

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const numbered = lines
    .map((line) => line.replace(/^\s*(?:\d+|Q\d+)[\).\-:\s]+/i, '').trim())
    .filter(Boolean);

  if (numbered.length >= expectedCount) {
    return numbered.slice(0, expectedCount);
  }

  if (lines.length === 1) {
    const sentenceSplit = lines[0].split(/(?<=\.)\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
    if (sentenceSplit.length >= expectedCount) {
      return sentenceSplit.slice(0, expectedCount);
    }
  }

  return numbered.length > 0 ? numbered : lines;
}

function extractQuestionKeywords(question) {
  return String(question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !ANSWER_STOPWORDS.has(token));
}

function buildHeuristicModelAnswer(question, retrievedChunks = []) {
  const material = retrievedChunks.map((chunk) => String(chunk?.text || '')).join(' ');
  const cleanedMaterial = material.replace(/\s+/g, ' ').trim();
  if (!cleanedMaterial) return 'The selected material has very limited relevant detail for this question.';

  const sentences = cleanedMaterial
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 25);

  if (sentences.length === 0) {
    return cleanedMaterial.split(' ').slice(0, 45).join(' ') + '.';
  }

  const keywords = extractQuestionKeywords(question);
  const scored = sentences.map((sentence, idx) => {
    const lower = sentence.toLowerCase();
    const score = keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0);
    return { sentence, score, idx };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
  const picked = scored
    .slice(0, 3)
    .filter((entry) => entry.score > 0 || keywords.length === 0)
    .map((entry) => entry.sentence);

  if (picked.length === 0) {
    return sentences.slice(0, 2).join(' ');
  }

  return picked.slice(0, 2).join(' ');
}

function normalizeModelAnswers(modelAnswers, questions, retrievedChunks) {
  const normalized = (modelAnswers || []).slice(0, questions.length).map((answer) => String(answer || '').trim());
  let replacedCount = 0;

  while (normalized.length < questions.length) {
    normalized.push('');
  }

  const completed = normalized.map((answer, idx) => {
    if (!answer || ANSWER_PLACEHOLDER_RE.test(answer)) {
      replacedCount += 1;
      return buildHeuristicModelAnswer(questions[idx], retrievedChunks);
    }
    return answer;
  });

  return {
    modelAnswers: completed,
    replacedCount
  };
}

function extractFallbackKeywords(text, maxKeywords = 12) {
  const tokens = String(text || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 4);

  const counts = new Map();
  tokens.forEach((token) => {
    const key = token.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([key]) => key);
}

function buildFallbackQuestions(retrievedChunks, count = 5, difficulty = 'medium') {
  const material = retrievedChunks.map((c) => c.text).join(' ');
  const keywords = extractFallbackKeywords(material, Math.max(10, count * 2));
  const prompts = {
    easy: 'What is',
    medium: 'Explain',
    hard: 'Analyze'
  };
  const starter = prompts[difficulty] || prompts.medium;

  const questions = [];
  for (const keyword of keywords) {
    if (questions.length >= count) break;
    questions.push(`${starter} ${keyword}?`);
  }

  const sentences = material
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let i = 0;
  while (questions.length < count && i < sentences.length) {
    const snippet = sentences[i].split(' ').slice(0, 12).join(' ');
    questions.push(`${starter} the concept in: "${snippet}"?`);
    i += 1;
  }

  while (questions.length < count) {
    questions.push(`${starter} the key idea from the provided material?`);
  }

  return questions.slice(0, count);
}

function parseQuestionsFallback(rawText, expectedCount) {
  const cleaned = String(rawText || '').trim();
  if (!cleaned) return [];

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const stripped = lines
    .map((line) => line.replace(/^\s*(?:\d+|Q\d+)[\).\-:\s]+/i, '').trim())
    .filter(Boolean);

  if (stripped.length >= expectedCount) {
    return stripped.slice(0, expectedCount);
  }

  return stripped.length > 0 ? stripped : lines;
}

/**
 * Generate questions using retrieved material context
 * @param {Array<Object>} retrievedChunks - From vector DB query
 * @param {string} difficulty - easy | medium | hard
 * @param {number} count - Number of questions
 * @param {string} customPrompt - Custom instruction from user
 * @returns {Promise<{questions: string[], modelAnswers: string[]} | {error: string}>}
 */
async function generateQuestionsWithRetrieval(
  retrievedChunks,
  difficulty = 'medium',
  count = 5,
  customPrompt = '',
  avoidQuestions = [],
  variationToken = ''
) {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return { error: 'No material chunks provided for question generation' };
  }

  const userPrompt = buildQuestionPrompt(
    retrievedChunks,
    difficulty,
    count,
    customPrompt,
    avoidQuestions,
    variationToken
  );

  const response = await callGroqAPI(QUESTION_GEN_SYSTEM, userPrompt, 0.8);

  if (!response) {
    const fallbackQuestions = buildFallbackQuestions(retrievedChunks, count, difficulty);
    const modelAnswerResult = await generateModelAnswersWithRetrieval(fallbackQuestions, retrievedChunks);
    return {
      questions: fallbackQuestions,
      modelAnswers: modelAnswerResult.modelAnswers || [],
      warning: 'Groq API unavailable; fallback questions generated',
      usedFallback: true
    };
  }

  try {
    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array in response');
    }

    const questions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(questions)) {
      throw new Error('Parsed JSON is not an array');
    }

    const finalQuestions = questions.slice(0, count);
    console.log(`[AI] ✅ Successfully generated ${finalQuestions.length} questions (${difficulty})`);

    const modelAnswerResult = await generateModelAnswersWithRetrieval(finalQuestions, retrievedChunks);
    if (modelAnswerResult.error) {
      console.warn('[AI] ⚠️ Model answer generation failed:', modelAnswerResult.error);
      return { questions: finalQuestions, modelAnswers: [], modelAnswerWarning: modelAnswerResult.error };
    }

    return {
      questions: finalQuestions,
      modelAnswers: modelAnswerResult.modelAnswers,
      modelAnswerWarning: modelAnswerResult.warning,
      usedFallback: false
    };
  } catch (err) {
    console.error('[AI] ❌ Failed to parse question JSON:', err.message);
    const fallbackQuestions = parseQuestionsFallback(response, count);
    if (fallbackQuestions.length > 0) {
      const modelAnswerResult = await generateModelAnswersWithRetrieval(fallbackQuestions, retrievedChunks);
      return {
        questions: fallbackQuestions.slice(0, count),
        modelAnswers: modelAnswerResult.modelAnswers || [],
        warning: 'Groq response parsed with fallback',
        usedFallback: true
      };
    }
    return { error: `Failed to parse Groq response: ${err.message}` };
  }
}

/**
 * Generate model answers for questions using retrieved material
 * @param {string[]} questions
 * @param {Array<Object>} retrievedChunks
 * @returns {Promise<{modelAnswers: string[]} | {error: string}>}
 */
async function generateModelAnswersWithRetrieval(questions, retrievedChunks) {
  if (!questions || questions.length === 0) {
    return { error: 'No questions provided for model answer generation' };
  }

  const userPrompt = buildModelAnswerPrompt(retrievedChunks, questions);
  const response = await callGroqAPI(MODEL_ANSWER_SYSTEM, userPrompt, 0.2);

  if (!response) {
    const heuristic = normalizeModelAnswers([], questions, retrievedChunks);
    return {
      modelAnswers: heuristic.modelAnswers,
      warning: 'Model answers generated from retrieved material fallback'
    };
  }

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array in response');
    }

    const modelAnswers = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(modelAnswers)) {
      throw new Error('Parsed JSON is not an array');
    }

    const normalized = normalizeModelAnswers(modelAnswers, questions, retrievedChunks);
    return {
      modelAnswers: normalized.modelAnswers,
      warning: normalized.replacedCount > 0
        ? `Replaced ${normalized.replacedCount} low-information model answers with context-based fallback`
        : undefined
    };
  } catch (err) {
    console.error('[AI] ❌ Failed to parse model answer JSON:', err.message);
    const fallbackAnswers = parseModelAnswersFallback(response, questions.length);
    if (fallbackAnswers.length) {
      const normalized = normalizeModelAnswers(fallbackAnswers, questions, retrievedChunks);
      return { modelAnswers: normalized.modelAnswers, warning: 'Model answers parsed with fallback' };
    }
    const heuristic = normalizeModelAnswers([], questions, retrievedChunks);
    return {
      modelAnswers: heuristic.modelAnswers,
      warning: `Model answer parse failed; context fallback used (${err.message})`
    };
  }
}

// ============================================================
// ANSWER EVALUATION (with vector retrieval)
// ============================================================

const EVAL_SYSTEM = `You are an expert academic evaluator scoring student answers precisely and fairly.

YOUR EVALUATION RULES:
1. Score ONLY based on: the question, retrieved model answer, and marking scheme
2. Do NOT use external knowledge - use ONLY the provided references
3. Follow the marking scheme EXACTLY - award marks only for items listed
4. Check for presence/absence of key concepts from the marking scheme
5. Be fair: reward correct concepts even if wording differs slightly
6. Identify common mistakes and apply deductions as specified
7. Award bonus marks if extra credit criteria are met
8. Output ONLY a valid JSON object - no text before or after

JSON Output Format (STRICT):
{
  "score": <number between 0 and max_score>,
  "max_score": <number>,
  "matched_concepts": [<list of correct concepts found in student answer>],
  "missing_concepts": [<list of concepts from scheme not in student answer>],
  "feedback": "<detailed explanation of score, what was done well, what was missed>",
  "marks_breakdown": {
    "total": <final score>,
    "key_concepts": <marks for concepts>,
    "bonus": <bonus marks>,
    "deductions": <marks deducted>
  }
}`;

const EVAL_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'under', 'while', 'where', 'when',
  'which', 'about', 'their', 'there', 'have', 'has', 'had', 'been', 'were', 'was', 'are', 'is', 'it', 'its',
  'you', 'your', 'yours', 'they', 'them', 'then', 'than', 'but', 'not', 'can', 'could', 'should', 'would',
  'may', 'might', 'will', 'shall', 'also', 'only', 'such', 'most', 'more', 'less', 'some', 'any', 'each',
  'all', 'other', 'these', 'those', 'our', 'ours', 'his', 'her', 'hers', 'him', 'she', 'he', 'we', 'us',
  'as', 'at', 'by', 'of', 'on', 'in', 'to', 'or', 'if', 'be', 'do', 'does', 'did', 'a', 'an'
]);

const CONCEPT_NOISE_TOKENS = new Set([
  'answer', 'answers', 'explain', 'explains', 'explained',
  'describe', 'describes', 'described', 'define', 'defined',
  'write', 'written', 'question', 'questions', 'student', 'students',
  'model', 'marks', 'marking', 'scheme', 'rubric', 'feedback',
  'parts', 'part', 'number', 'types', 'type', 'structure',
  'what', 'which', 'how', 'why', 'when', 'where', 'after', 'before'
]);

function tokenizeForEval(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !EVAL_STOPWORDS.has(token));
}

function buildBigrams(tokens) {
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

function extractKeyConcepts(modelContext, maxConcepts = 12) {
  const tokens = tokenizeForEval(modelContext);
  const freq = new Map();
  tokens.forEach((token) => {
    freq.set(token, (freq.get(token) || 0) + 1);
  });

  return Array.from(freq.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, maxConcepts)
    .map(([concept]) => concept);
}

function normalizeEvaluationOutput(evaluation, maxScore) {
  const rawScoreValue =
    evaluation.score ?? evaluation.marks ?? evaluation.total ?? evaluation.obtained_marks ?? 0;

  let rawScore = Number(rawScoreValue);
  if (!Number.isFinite(rawScore)) {
    const extracted = String(rawScoreValue || '').match(/-?\d+(?:\.\d+)?/);
    rawScore = extracted ? Number(extracted[0]) : 0;
  }

  const matched = evaluation.matched_concepts || evaluation.matchedConcepts || [];
  const missing = evaluation.missing_concepts || evaluation.missingConcepts || [];
  const marksBreakdown = evaluation.marks_breakdown || evaluation.marksBreakdown || {};

  return {
    score: Math.min(maxScore, Math.max(0, Number.isFinite(rawScore) ? rawScore : 0)),
    max_score: maxScore,
    matched_concepts: Array.isArray(matched) ? matched : [],
    missing_concepts: Array.isArray(missing) ? missing : [],
    feedback: evaluation.feedback || 'Evaluation complete',
    marks_breakdown: {
      total: marksBreakdown.total != null ? marksBreakdown.total : undefined,
      key_concepts: marksBreakdown.key_concepts != null ? marksBreakdown.key_concepts : marksBreakdown.keyConcepts,
      bonus: marksBreakdown.bonus != null ? marksBreakdown.bonus : 0,
      deductions: marksBreakdown.deductions != null ? marksBreakdown.deductions : 0
    }
  };
}

function generateHeuristicEvaluation(question, retrievedModelAnswerChunks, studentAnswer, maxScore = 10) {
  const modelContext = (retrievedModelAnswerChunks || []).map((c) => c.text || '').join(' ');
  const modelTokens = tokenizeForEval(modelContext);
  const studentTokens = tokenizeForEval(studentAnswer);

  const modelSet = new Set(modelTokens);
  const studentSet = new Set(studentTokens);
  const matchedTokens = Array.from(studentSet).filter((token) => modelSet.has(token));

  const conceptList = extractKeyConcepts(modelContext, 12);
  const matchedConcepts = conceptList.filter((concept) => studentSet.has(concept));
  const missingConcepts = conceptList.filter((concept) => !studentSet.has(concept));

  const modelBigrams = new Set(buildBigrams(modelTokens));
  const studentBigrams = buildBigrams(studentTokens);
  const matchedBigrams = studentBigrams.filter((bg) => modelBigrams.has(bg)).length;

  const conceptCoverage = conceptList.length > 0 ? matchedConcepts.length / conceptList.length : 0;
  const tokenCoverage = modelSet.size > 0 ? matchedTokens.length / modelSet.size : 0;
  const bigramCoverage = modelBigrams.size > 0 ? matchedBigrams / modelBigrams.size : 0;

  const studentLength = String(studentAnswer || '').trim().length;
  const lengthScore = studentLength >= 120 ? 1 : Math.max(0.35, studentLength / 120);

  const weightedCoverage =
    (conceptCoverage * 0.5) +
    (tokenCoverage * 0.3) +
    (bigramCoverage * 0.2);

  const finalRatio = Math.max(0, Math.min(1, (weightedCoverage * 0.9) + (lengthScore * 0.1)));
  const score = Math.round(maxScore * finalRatio);

  return {
    score,
    max_score: maxScore,
    matched_concepts: matchedConcepts,
    missing_concepts: missingConcepts,
    feedback: `Heuristic evaluation: matched ${matchedConcepts.length}/${conceptList.length || 0} core concepts from the model context.`,
    marks_breakdown: {
      total: score,
      key_concepts: Number((maxScore * weightedCoverage).toFixed(2)),
      bonus: 0,
      deductions: Number((maxScore - score).toFixed(2))
    }
  };
}

function normalizeSentence(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitMeaningfulSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => normalizeSentence(sentence))
    .filter((sentence) => sentence.split(' ').length >= 4);
}

function tokenizeSentenceForCoverage(sentence) {
  return String(sentence || '')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !EVAL_STOPWORDS.has(token));
}

function sentenceSimilarity(modelSentence, studentSentence) {
  const modelTokens = tokenizeSentenceForCoverage(modelSentence);
  const studentTokens = tokenizeSentenceForCoverage(studentSentence);

  if (modelTokens.length === 0 || studentTokens.length === 0) {
    return { containment: 0, jaccard: 0, score: 0 };
  }

  const modelSet = new Set(modelTokens);
  const studentSet = new Set(studentTokens);
  const intersection = Array.from(modelSet).filter((token) => studentSet.has(token)).length;
  const union = new Set([...modelSet, ...studentSet]).size;

  const containment = intersection / Math.max(1, modelSet.size);
  const jaccard = intersection / Math.max(1, union);
  const score = (containment * 0.7) + (jaccard * 0.3);

  return { containment, jaccard, score };
}

function computeLineCoverage(modelContext, studentAnswer) {
  const modelSentences = splitMeaningfulSentences(modelContext);
  const studentSentences = splitMeaningfulSentences(studentAnswer);

  if (modelSentences.length === 0) {
    return { sentenceCoverage: 0, sentenceCount: 0, matchedSentenceCount: 0 };
  }

  const usedStudentIdx = new Set();
  let matched = 0;

  for (const modelSentence of modelSentences) {
    let bestIdx = -1;
    let bestScore = 0;
    let bestContainment = 0;
    let bestJaccard = 0;

    for (let i = 0; i < studentSentences.length; i += 1) {
      if (usedStudentIdx.has(i)) continue;
      const sim = sentenceSimilarity(modelSentence, studentSentences[i]);
      if (sim.score > bestScore) {
        bestScore = sim.score;
        bestContainment = sim.containment;
        bestJaccard = sim.jaccard;
        bestIdx = i;
      }
    }

    const isMatch =
      bestContainment >= 0.75 ||
      (bestContainment >= 0.67 && bestJaccard >= 0.48);

    if (bestIdx >= 0 && isMatch) {
      usedStudentIdx.add(bestIdx);
      matched += 1;
    }
  }

  return {
    sentenceCoverage: matched / modelSentences.length,
    sentenceCount: modelSentences.length,
    matchedSentenceCount: matched
  };
}

function computeMissingConceptRatio(evalResult) {
  const matchedCount = Array.isArray(evalResult?.matched_concepts) ? evalResult.matched_concepts.length : 0;
  const missingCount = Array.isArray(evalResult?.missing_concepts) ? evalResult.missing_concepts.length : 0;
  const total = matchedCount + missingCount;
  if (total <= 0) return 0;
  return missingCount / total;
}

function mergeConcepts(primary = [], secondary = []) {
  const merged = [];
  const seen = new Set();
  for (const concept of [...primary, ...secondary]) {
    const val = String(concept || '').trim();
    if (!val) continue;
    const key = val.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(val);
  }
  return merged;
}

function normalizeConceptText(concept) {
  return String(concept || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningfulConcept(concept) {
  const normalized = normalizeConceptText(concept);
  if (!normalized) return false;

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0) return false;

  // Drop obvious instruction/meta concepts and tiny fragments
  const meaningfulTokens = tokens.filter((token) => token.length >= 4 && !CONCEPT_NOISE_TOKENS.has(token));
  return meaningfulTokens.length > 0;
}

function filterConceptList(concepts = []) {
  return (Array.isArray(concepts) ? concepts : []).filter(isMeaningfulConcept);
}

function normalizeForConceptMatch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeConceptText(text) {
  return normalizeForConceptMatch(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !EVAL_STOPWORDS.has(token));
}

function bestAliasMatch(alias, studentSentences) {
  const aliasNormalized = normalizeForConceptMatch(alias);
  const aliasTokens = tokenizeConceptText(alias);
  if (!aliasNormalized || aliasTokens.length === 0) {
    return { ratio: 0, sentence: '', direct: false };
  }

  let best = { ratio: 0, sentence: '', direct: false };
  for (const sentence of studentSentences) {
    const normalizedSentence = normalizeForConceptMatch(sentence);
    if (!normalizedSentence) continue;

    const sentenceTokens = new Set(tokenizeConceptText(normalizedSentence));
    if (sentenceTokens.size === 0) continue;

    const matched = aliasTokens.filter((token) => sentenceTokens.has(token)).length;
    const ratio = matched / aliasTokens.length;
    const direct = normalizedSentence.includes(aliasNormalized);

    if ((direct ? 1 : ratio) > (best.direct ? 1 : best.ratio)) {
      best = { ratio, sentence: sentence.trim(), direct };
    }
  }

  return best;
}

function inferDepthLevelFromEvidence(evidenceSentence, confidenceRatio, hasDirectMatch) {
  const normalized = normalizeForConceptMatch(evidenceSentence);
  if (!normalized) return 'none';

  const explanationSignals = [
    'is', 'are', 'means', 'refers', 'called', 'consists', 'contains', 'formed', 'made', 'function'
  ];
  const linkageSignals = [
    'because', 'therefore', 'thus', 'hence', 'after', 'before', 'from', 'within', 'by', 'through', 'while', 'whereas'
  ];

  const hasExplanation = explanationSignals.some((word) => normalized.includes(` ${word} `) || normalized.startsWith(`${word} `));
  const hasLinkage = linkageSignals.some((word) => normalized.includes(` ${word} `) || normalized.startsWith(`${word} `));

  if ((hasLinkage && confidenceRatio >= 0.65) || (hasDirectMatch && hasLinkage)) {
    return 'linkage';
  }
  if ((hasExplanation && confidenceRatio >= 0.55) || (hasDirectMatch && confidenceRatio >= 0.5)) {
    return 'explanation';
  }
  if (confidenceRatio >= 0.45 || hasDirectMatch) {
    return 'mention';
  }
  return 'none';
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function computeEvidenceContextQuality(evidenceSentence, aliasText = '') {
  const sentenceTokens = tokenizeConceptText(evidenceSentence);
  if (sentenceTokens.length === 0) return 0.75;

  const aliasTokens = new Set(tokenizeConceptText(aliasText));
  const descriptiveTokenCount = sentenceTokens.filter((token) => !aliasTokens.has(token)).length;
  const richness = clamp(descriptiveTokenCount / 8, 0, 1);

  const normalized = normalizeForConceptMatch(evidenceSentence);
  const relationSignals = [
    'because', 'therefore', 'thus', 'hence', 'since', 'after', 'before',
    'from', 'through', 'during', 'which', 'that', 'whereas', 'results in'
  ];
  const signalHits = relationSignals.reduce((count, signal) => count + (normalized.includes(signal) ? 1 : 0), 0);
  const relationScore = clamp(signalHits / 2, 0, 1);

  return clamp(0.72 + (richness * 0.22) + (relationScore * 0.12), 0.62, 1.2);
}

function computeHumanExpressionBonus(studentAnswer, conceptEvidence, maxScore) {
  const answerText = String(studentAnswer || '').trim();
  if (!answerText) return 0;

  const sentences = answerText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 4);

  if (sentences.length === 0) return 0;

  const allTokens = tokenizeConceptText(answerText);
  if (allTokens.length === 0) return 0;

  const uniqueRatio = new Set(allTokens).size / allTokens.length;
  const avgSentenceLength = allTokens.length / sentences.length;

  const normalizedAnswer = normalizeForConceptMatch(answerText);
  const coherenceSignals = ['because', 'therefore', 'thus', 'hence', 'so', 'which', 'that', 'while', 'whereas'];
  const coherenceHitCount = coherenceSignals.reduce(
    (count, signal) => count + (normalizedAnswer.includes(signal) ? 1 : 0),
    0
  );

  const explanationDensity = clamp(avgSentenceLength / 18, 0, 1);
  const lexicalVariety = clamp(uniqueRatio / 0.75, 0, 1);
  const coherenceScore = clamp(coherenceHitCount / Math.max(2, sentences.length), 0, 1);
  const evidenceDepthScore = clamp(
    (Array.isArray(conceptEvidence)
      ? conceptEvidence.filter((entry) => tokenizeConceptText(entry?.evidence || '').length >= 7).length / Math.max(1, conceptEvidence.length)
      : 0),
    0,
    1
  );

  const blendedQuality =
    (explanationDensity * 0.35) +
    (coherenceScore * 0.25) +
    (lexicalVariety * 0.2) +
    (evidenceDepthScore * 0.2);

  return Number((maxScore * 0.12 * blendedQuality).toFixed(2));
}

function evaluateWithConceptFirstRubric(question, retrievedModelAnswerChunks, studentAnswer, maxScore, rubric) {
  const requiredConcepts = Array.isArray(rubric?.requiredConcepts) ? rubric.requiredConcepts : [];
  const criticalErrors = Array.isArray(rubric?.criticalErrors) ? rubric.criticalErrors : [];
  const modelContext = (retrievedModelAnswerChunks || []).map((c) => c.text || '').join(' ');
  const studentSentences = String(studentAnswer || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!requiredConcepts.length) {
    return generateHeuristicEvaluation(question, retrievedModelAnswerChunks, studentAnswer, maxScore);
  }

  let rawConceptScore = 0;
  let rawPenalty = 0;
  let linkageCount = 0;
  let explanationCount = 0;
  let mentionCount = 0;
  const matchedConcepts = [];
  const missingConcepts = [];
  const conceptEvidence = [];

  const totalConceptWeight = requiredConcepts.reduce((sum, c) => sum + Math.max(0, Number(c.weight) || 0), 0) || maxScore;

  for (const concept of requiredConcepts) {
    const conceptName = String(concept?.concept || '').trim();
    if (!conceptName) continue;

    const aliases = [
      conceptName,
      ...(Array.isArray(concept?.synonyms) ? concept.synonyms : [])
    ].map((v) => String(v || '').trim()).filter(Boolean);

    const depthLevels = {
      mention: Number(concept?.depthLevels?.mention) || 1,
      explanation: Number(concept?.depthLevels?.explanation) || 2,
      linkage: Number(concept?.depthLevels?.linkage) || 3
    };

    const conceptWeight = Math.max(0, Number(concept?.weight) || depthLevels.linkage || 1);

    let best = { ratio: 0, sentence: '', direct: false, alias: '' };
    for (const alias of aliases) {
      const aliasMatch = bestAliasMatch(alias, studentSentences);
      if ((aliasMatch.direct ? 1 : aliasMatch.ratio) > (best.direct ? 1 : best.ratio)) {
        best = { ...aliasMatch, alias };
      }
    }

    const depthLevel = inferDepthLevelFromEvidence(best.sentence, best.ratio, best.direct);
    const depthMark = depthLevel === 'linkage'
      ? depthLevels.linkage
      : depthLevel === 'explanation'
        ? depthLevels.explanation
        : depthLevel === 'mention'
          ? depthLevels.mention
          : 0;

    const confidence = clamp(best.direct ? Math.max(best.ratio, 0.9) : best.ratio, 0, 1);
    const contextQuality = computeEvidenceContextQuality(best.sentence, best.alias || conceptName);

    let awarded = 0;
    if (depthMark > 0) {
      const confidenceAdjusted = depthMark * (0.58 + (confidence * 0.42));
      awarded = Math.min(conceptWeight, Math.max(0, confidenceAdjusted * contextQuality));
    } else if (confidence >= 0.35) {
      // Near-miss credit when surrounding statement partially aligns with concept intent.
      const nearMissCap = Math.min(conceptWeight * 0.35, depthLevels.mention * 0.9);
      awarded = nearMissCap * ((confidence - 0.35) / 0.65);
    }

    awarded = Number(Math.max(0, awarded).toFixed(2));

    if (awarded > 0) {
      rawConceptScore += awarded;
      if (depthLevel === 'linkage') linkageCount += 1;
      else if (depthLevel === 'explanation') explanationCount += 1;
      else mentionCount += 1;
      matchedConcepts.push(`${conceptName} [${depthLevel !== 'none' ? depthLevel : 'partial'}]`);
      conceptEvidence.push({
        concept: conceptName,
        matchedAlias: best.alias || conceptName,
        depthLevel,
        awarded,
        max: conceptWeight,
        confidence: Number(confidence.toFixed(2)),
        context_quality: Number(contextQuality.toFixed(2)),
        evidence: best.sentence || ''
      });
    } else {
      missingConcepts.push(conceptName);
    }
  }

  const criticalEvidence = [];
  for (const err of criticalErrors) {
    const statement = String(err?.statement || '').trim();
    if (!statement) continue;
    const aliases = [statement, ...(Array.isArray(err?.synonyms) ? err.synonyms : [])]
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    let triggered = null;

    for (const alias of aliases) {
      const hit = bestAliasMatch(alias, studentSentences);
      if (hit.direct || hit.ratio >= 0.62) {
        triggered = { alias, hit };
        break;
      }
    }

    if (triggered) {
      const penalty = Math.max(0, Number(err?.penalty) || 1);
      const hitStrength = clamp(triggered.hit.direct ? 1 : triggered.hit.ratio, 0, 1);
      const appliedPenalty = Number((penalty * (0.55 + (hitStrength * 0.45))).toFixed(2));
      rawPenalty += appliedPenalty;
      criticalEvidence.push({
        statement,
        penalty: appliedPenalty,
        evidence: triggered.hit.sentence || '',
        matchedAlias: triggered.alias,
        hit_strength: Number(hitStrength.toFixed(2))
      });
    }
  }

  const scoreScale = maxScore / Math.max(1, totalConceptWeight);
  const scaledConceptScore = rawConceptScore * scoreScale;
  const scaledPenalty = rawPenalty * scoreScale;
  const humanExpressionBonus = computeHumanExpressionBonus(studentAnswer, conceptEvidence, maxScore);
  const conceptStrength = rawConceptScore / Math.max(1, totalConceptWeight);
  const completionRatio = (requiredConcepts.length > 0)
    ? ((requiredConcepts.length - missingConcepts.length) / requiredConcepts.length)
    : 0;
  const depthQualityRatio = (requiredConcepts.length > 0)
    ? ((linkageCount * 1) + (explanationCount * 0.72) + (mentionCount * 0.45)) / requiredConcepts.length
    : 0;

  const scaledMissingPenalty = maxScore * (1 - completionRatio) * 0.24;
  const scaledShallowPenalty = maxScore * Math.max(0, completionRatio - depthQualityRatio) * 0.12;
  const depthBonus = maxScore * Math.max(0, depthQualityRatio - 0.55) * 0.08;
  const conceptConsistencyBonus = maxScore * Math.max(0, conceptStrength - 0.45) * 0.05;

  const blended =
    scaledConceptScore -
    scaledPenalty -
    scaledMissingPenalty -
    scaledShallowPenalty +
    humanExpressionBonus +
    depthBonus +
    conceptConsistencyBonus;

  let calibratedBlended = blended;

  // When exactly one required concept is missing (and no critical contradiction),
  // keep marks around the high-pass band, but still dependent on depth/coverage quality.
  if (
    requiredConcepts.length >= 4 &&
    missingConcepts.length === 1 &&
    criticalEvidence.length === 0
  ) {
    const nearEightyRatio = clamp(
      0.78 +
      ((depthQualityRatio - 0.65) * 0.08) +
      ((conceptStrength - completionRatio) * 0.06),
      0.74,
      0.85
    );
    const adaptiveFloor = maxScore * nearEightyRatio;
    calibratedBlended = Math.max(calibratedBlended, adaptiveFloor);
  }

  const finalScore = Math.round(Math.min(maxScore, Math.max(0, calibratedBlended)));
  const keyConceptScore = Math.min(maxScore, Math.max(0, Number(scaledConceptScore.toFixed(2))));

  const feedbackParts = [
    `Concept-first evaluation: matched ${matchedConcepts.length}/${requiredConcepts.length} required concepts.`
  ];
  if (missingConcepts.length > 0) {
    feedbackParts.push(`Missing concepts: ${missingConcepts.slice(0, 5).join(', ')}.`);
  }
  if (criticalEvidence.length > 0) {
    feedbackParts.push(`Critical errors detected: ${criticalEvidence.length} (penalty ${Number(scaledPenalty.toFixed(2))}).`);
  }
  if (humanExpressionBonus > 0) {
    feedbackParts.push(`Contextual explanation quality bonus: ${humanExpressionBonus.toFixed(2)}.`);
  }
  if (!studentAnswer || !String(studentAnswer).trim()) {
    feedbackParts.push('Student answer is empty.');
  }

  return {
    score: finalScore,
    max_score: maxScore,
    matched_concepts: matchedConcepts,
    missing_concepts: missingConcepts,
    feedback: feedbackParts.join(' '),
    marks_breakdown: {
      total: finalScore,
      key_concepts: keyConceptScore,
      bonus: 0,
      deductions: Number((maxScore - finalScore).toFixed(2)),
      concept_first: true,
  human_expression_bonus: humanExpressionBonus,
  depth_bonus: Number(depthBonus.toFixed(2)),
  concept_consistency_bonus: Number(conceptConsistencyBonus.toFixed(2)),
  missing_concept_penalty: Number(scaledMissingPenalty.toFixed(2)),
  shallow_coverage_penalty: Number(scaledShallowPenalty.toFixed(2)),
  completion_ratio: Number(completionRatio.toFixed(3)),
  depth_quality_ratio: Number(depthQualityRatio.toFixed(3)),
      concept_evidence: conceptEvidence,
      critical_error_hits: criticalEvidence,
      raw_concept_score: Number(rawConceptScore.toFixed(2)),
      raw_penalty: Number(rawPenalty.toFixed(2))
    }
  };
}

function isConceptFirstRubric(rubric) {
  return Boolean(
    rubric &&
    typeof rubric === 'object' &&
    String(rubric.type || '').toLowerCase() === 'concept_first_v1' &&
    Array.isArray(rubric.requiredConcepts) &&
    rubric.requiredConcepts.length > 0
  );
}

function calibrateEvaluationWithSimilarity(llmEval, heuristicEval, modelContext, studentAnswer, maxScore) {
  const coverage = computeLineCoverage(modelContext, studentAnswer);
  const llmScore = Number(llmEval?.score || 0);
  const heuristicScore = Number(heuristicEval?.score || 0);

  const matched = filterConceptList(mergeConcepts(
    llmEval?.matched_concepts || [],
    heuristicEval?.matched_concepts || []
  ));

  const missing = filterConceptList(mergeConcepts(
    llmEval?.missing_concepts || [],
    heuristicEval?.missing_concepts || []
  )).filter((concept) => !matched.some((item) => item.toLowerCase() === concept.toLowerCase()));

  const matchedConceptCount = matched.length;
  const missingConceptCount = missing.length;
  const combinedMissingRatio = (matchedConceptCount + missingConceptCount) > 0
    ? (missingConceptCount / (matchedConceptCount + missingConceptCount))
    : Math.max(0, Math.min(1, (computeMissingConceptRatio(llmEval) * 0.3) + (computeMissingConceptRatio(heuristicEval) * 0.7)));

  const lineWeightedScore = maxScore * coverage.sentenceCoverage;

  let llmWeight = 0.30;
  let heuristicWeight = 0.50;
  const lineWeight = 0.20;

  const scoreGap = llmScore - heuristicScore;
  if (coverage.sentenceCoverage >= 0.9 && scoreGap <= (-0.25 * maxScore)) {
    llmWeight = 0.15;
    heuristicWeight = 0.65;
  } else if (coverage.sentenceCoverage <= 0.7 && scoreGap >= (0.25 * maxScore)) {
    llmWeight = 0.20;
    heuristicWeight = 0.60;
  }

  // Blend keeps LLM judgement, but stabilizes it against deterministic semantic and line coverage signals.
  let blended = (llmScore * llmWeight) + (heuristicScore * heuristicWeight) + (lineWeightedScore * lineWeight);

  // Penalize missing lines and concept gaps to differentiate near-identical but incomplete answers.
  const omissionPenalty = maxScore * (1 - coverage.sentenceCoverage) * 0.30;
  const conceptPenalty = maxScore * combinedMissingRatio * 0.22;
  const excessMissing = Math.max(0, missingConceptCount - matchedConceptCount);
  const missingCountPenalty = Math.min(maxScore * 0.10, excessMissing * 0.12);
  blended -= (omissionPenalty + conceptPenalty + missingCountPenalty);

  // Slight recovery for truly near-complete answers.
  if (coverage.sentenceCoverage >= 0.9 && combinedMissingRatio <= 0.15) {
    blended += maxScore * 0.08;
  } else if (coverage.sentenceCoverage >= 0.8 && combinedMissingRatio <= 0.22) {
    blended += maxScore * 0.04;
  }

  // Prevent severe underscoring when answer is very close to reference and heuristics agree.
  if (coverage.sentenceCoverage >= 0.95 && heuristicScore >= (0.75 * maxScore)) {
    blended = Math.max(blended, Math.max(maxScore * 0.82, heuristicScore * 0.9));
  }

  // Guardrail: if there is substantial conceptual match, prevent collapse to near-zero.
  const strongestEvidenceRatio = Math.max(llmScore / Math.max(1, maxScore), heuristicScore / Math.max(1, maxScore));
  if (matchedConceptCount >= 4 && strongestEvidenceRatio >= 0.35) {
    blended = Math.max(blended, maxScore * 0.35);
  }
  if (matchedConceptCount >= 8 && strongestEvidenceRatio >= 0.45) {
    blended = Math.max(blended, maxScore * 0.48);
  }

  const coverageCap = maxScore * (0.55 + (coverage.sentenceCoverage * 0.45));
  blended = Math.min(blended, coverageCap);

  let calibratedScore = Math.min(maxScore, Math.max(0, Math.round(blended)));
  if (calibratedScore === 0 && matchedConceptCount >= 3 && strongestEvidenceRatio >= 0.25) {
    calibratedScore = Math.max(1, Math.round(maxScore * 0.20));
  }

  const keyConceptRatio = (matchedConceptCount + missingConceptCount) > 0
    ? (matchedConceptCount / (matchedConceptCount + missingConceptCount))
    : 0;

  return {
    score: calibratedScore,
    max_score: maxScore,
    matched_concepts: matched,
    missing_concepts: missing,
    feedback: llmEval?.feedback || heuristicEval.feedback,
    marks_breakdown: {
      total: calibratedScore,
      key_concepts: Number((maxScore * keyConceptRatio).toFixed(2)),
      bonus: llmEval?.marks_breakdown?.bonus || 0,
      deductions: Number((maxScore - calibratedScore).toFixed(2)),
      line_coverage_ratio: Number(coverage.sentenceCoverage.toFixed(3)),
      matched_line_count: coverage.matchedSentenceCount,
      total_line_count: coverage.sentenceCount,
      concept_missing_count: missingConceptCount
    }
  };
}

function buildEvaluationPrompt(question, retrievedModelAnswerChunks, studentAnswer, maxScore, rubric) {
  const modelAnswerContext = retrievedModelAnswerChunks.map(c => c.text).join('\n\n');

  const rubricText = typeof rubric === 'string' 
    ? rubric 
    : JSON.stringify(rubric, null, 2);

  return `QUESTION:
${question}

MODEL ANSWER CONTEXT (retrieved reference):
---
${modelAnswerContext}
---

STUDENT ANSWER:
---
${studentAnswer}
---

MARKING SCHEME (FOLLOW THIS STRICTLY):
${rubricText}

Maximum score: ${maxScore}

INSTRUCTIONS:
1. Evaluate the student answer ONLY against the model answer context above.
2. Follow the marking scheme exactly for awarding marks.
3. Identify key concepts present or missing as per the scheme.
4. Check for common mistakes listed in the scheme.
5. Apply bonus marks if criteria are met.
6. Provide detailed feedback explaining the score.
7. Output ONLY valid JSON (no markdown, no extra text).`;
}

/**
 * Evaluate student answer using vector-retrieved model answer context
 * @param {string} question - The question being answered
 * @param {Array<Object>} retrievedModelAnswerChunks - From vector DB query
 * @param {string} studentAnswer - Student's response
 * @param {number} maxScore - Maximum marks for this question
 * @param {string|Object} rubric - Scoring rubric
 * @returns {Promise<Object>} Evaluation result JSON
 */
async function evaluateAnswerWithRetrieval(
  question,
  retrievedModelAnswerChunks,
  studentAnswer,
  maxScore = 10,
  rubric = 'Standard rubric'
) {
  if (!retrievedModelAnswerChunks || retrievedModelAnswerChunks.length === 0) {
    return generateHeuristicEvaluation(question, [], studentAnswer, maxScore);
  }

  if (isConceptFirstRubric(rubric)) {
    return evaluateWithConceptFirstRubric(
      question,
      retrievedModelAnswerChunks,
      studentAnswer,
      maxScore,
      rubric
    );
  }

  const userPrompt = buildEvaluationPrompt(
    question,
    retrievedModelAnswerChunks,
    studentAnswer,
    maxScore,
    rubric
  );

  const response = await callGroqAPI(EVAL_SYSTEM, userPrompt, 0); // Deterministic

  if (!response) {
    console.warn('[AI] Groq API failed, using heuristic evaluation');
    return generateHeuristicEvaluation(question, retrievedModelAnswerChunks, studentAnswer, maxScore);
  }

  try {
    // Extract JSON object from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object in response');
    }
    const evaluation = JSON.parse(jsonMatch[0]);

    // Validate and normalize + calibrate with deterministic similarity signals
    const normalizedEval = normalizeEvaluationOutput(evaluation, maxScore);
    const heuristicEval = generateHeuristicEvaluation(question, retrievedModelAnswerChunks, studentAnswer, maxScore);
    const modelContext = retrievedModelAnswerChunks.map((c) => c.text || '').join(' ');

    return calibrateEvaluationWithSimilarity(
      normalizedEval,
      heuristicEval,
      modelContext,
      studentAnswer,
      maxScore
    );
  } catch (err) {
    console.error('[AI] ❌ Failed to parse evaluation JSON:', err.message);
    return generateHeuristicEvaluation(question, retrievedModelAnswerChunks, studentAnswer, maxScore);
  }
}

/**
 * Simple evaluation fallback
 */
function generateSimpleEvaluation(studentAnswer, maxScore = 10) {
  const length = (studentAnswer || '').length;
  const score = Math.min(
    maxScore,
    Math.round((Math.min(length, 200) / 200) * maxScore * 0.8)
  );

  return {
    score,
    max_score: maxScore,
    feedback: `Answer evaluated based on length and content. Score: ${score}/${maxScore}`
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Question generation
  generateQuestionsWithRetrieval,
  generateModelAnswersWithRetrieval,
  buildQuestionPrompt,

  // Answer evaluation
  evaluateAnswerWithRetrieval,
  buildEvaluationPrompt,

  // Utilities
  callGroqAPI,
  GROQ_MODEL
};
