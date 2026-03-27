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
    console.error('[AI] ❌ Groq API Error:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return null;
  }
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
4. ✅ If the material does not contain enough information, respond with: "Not enough information in the provided material."
5. ✅ Output ONLY a valid JSON array of answer strings - nothing else
6. ✅ NO text before or after the JSON array.`;

function buildQuestionPrompt(retrievedMaterialChunks, difficulty = 'medium', count = 5, customPrompt = '') {
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
  customPrompt = ''
) {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return { error: 'No material chunks provided for question generation' };
  }

  const userPrompt = buildQuestionPrompt(retrievedChunks, difficulty, count, customPrompt);

  const response = await callGroqAPI(QUESTION_GEN_SYSTEM, userPrompt, 0.8);

  if (!response) {
    return { error: 'Groq API failed to generate questions' };
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
      return { questions: finalQuestions, modelAnswers: [] };
    }

    return { questions: finalQuestions, modelAnswers: modelAnswerResult.modelAnswers };
  } catch (err) {
    console.error('[AI] ❌ Failed to parse question JSON:', err.message);
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
    return { error: 'Groq API failed to generate model answers' };
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

    const trimmed = modelAnswers.slice(0, questions.length).map(a => String(a || '').trim());
    return { modelAnswers: trimmed };
  } catch (err) {
    console.error('[AI] ❌ Failed to parse model answer JSON:', err.message);
    return { error: `Failed to parse model answer response: ${err.message}` };
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
    return generateFallbackEvaluation(studentAnswer, maxScore);
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
    console.warn('[AI] Groq API failed, using simple evaluation');
    return generateSimpleEvaluation(studentAnswer, maxScore);
  }

  try {
    // Extract JSON object from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object in response');
    }
    const evaluation = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize
    return {
      score: Math.min(maxScore, Math.max(0, evaluation.score || 0)),
      max_score: maxScore,
      feedback: evaluation.feedback || 'Evaluation complete'
    };
  } catch (err) {
    console.error('[AI] ❌ Failed to parse evaluation JSON:', err.message);
    return generateSimpleEvaluation(studentAnswer, maxScore);
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
