/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Combines the existing vectorDbService (retrieval) and embeddingService
 * (query embedding) with a Groq LLM call to produce grounded,
 * source-cited answers from uploaded study material.
 *
 * ────────────────────────────────────────────────────
 *  query  →  embed  →  vector search  →  build prompt  →  LLM  →  answer
 * ────────────────────────────────────────────────────
 *
 * This file is **additive** — it imports from existing services but never
 * modifies their behaviour or return values.
 */

const axios = require('axios');
const embeddingService = require('./embeddingService');
const vectorDbService = require('./vectorDbService');

// ── Config ───────────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Max characters per retrieved chunk sent to the LLM (avoids token overflow)
const MAX_CHUNK_CHARS = 800;
// Max total context characters assembled from all chunks
const MAX_CONTEXT_CHARS = 4000;

// ── System prompts per mode ──────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  qa: `You are a knowledgeable subject-matter tutor. Answer the student's question
using ONLY the provided source snippets. Cite sources inline as [1], [2], etc.
If the answer is not in the sources, say "Not found in provided sources" and
then give a brief best-effort answer clearly marked as outside the sources.
Keep the answer clear, accurate, and concise.`,

  summarize: `You are a study-aid assistant. Summarize the provided source
snippets into a clear, well-structured summary. Use bullet points where helpful.
Cite sources inline as [1], [2], etc.`,

  evaluate: `You are an expert examiner. Using the provided source material as
the ground truth, evaluate how well the student's text covers the key concepts.
List matched concepts, missing concepts, and give a score from 0-100.
Return your evaluation in this JSON format:
{
  "score": <0-100>,
  "matchedConcepts": ["..."],
  "missingConcepts": ["..."],
  "feedback": "..."
}`,
};

// ── Core functions ───────────────────────────────────────────────────────────

/**
 * Retrieve the top-K most relevant chunks from the vector DB.
 *
 * @param {string} query   - Natural language query
 * @param {number} [topK=5] - How many chunks to retrieve
 * @returns {Promise<Array<{score:number, text:string, source:string, section:string}>>}
 */
async function retrieveContext(query, topK = 5) {
  // 1. Embed the query
  const queryVector = await embeddingService.generateEmbedding(query);

  // 2. Search material index
  const results = vectorDbService.queryMaterial(queryVector, topK);

  // 3. Truncate individual chunks to MAX_CHUNK_CHARS
  return results.map((r) => ({
    score: r.score,
    text: r.text.length > MAX_CHUNK_CHARS ? r.text.slice(0, MAX_CHUNK_CHARS) + '…' : r.text,
    source: r.source || 'unknown',
    section: r.section || 'general',
  }));
}

/**
 * Build the numbered-source context block that goes into the LLM prompt.
 */
function buildContextBlock(retrieved) {
  let block = '';
  let totalChars = 0;

  for (let i = 0; i < retrieved.length; i++) {
    const entry =
      `[${i + 1}] (Source: ${retrieved[i].source} — ${retrieved[i].section})\n` +
      retrieved[i].text +
      '\n\n';

    if (totalChars + entry.length > MAX_CONTEXT_CHARS) break;
    block += entry;
    totalChars += entry.length;
  }

  return block.trim();
}

/**
 * Call Groq LLM with a system + user message pair.
 * Falls back to a simple error message if unavailable.
 */
async function callLLM(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured — cannot generate RAG answer');
  }

  const response = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.choices[0].message.content.trim();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Full RAG pipeline: retrieve → build prompt → generate.
 *
 * @param {string}  query           - The question / student answer / topic
 * @param {Object}  [options]
 * @param {number}  [options.topK=5]       - Chunks to retrieve
 * @param {string}  [options.mode='qa']    - 'qa' | 'summarize' | 'evaluate'
 * @param {boolean} [options.debug=false]  - Include assembled prompt in response
 * @returns {Promise<{answer:string, sources:Array, model:string, prompt?:string}>}
 */
async function query(query, options = {}) {
  const { topK = 5, mode = 'qa', debug = false } = options;

  console.log(`[RAG] query="${query.slice(0, 80)}…" mode=${mode} topK=${topK}`);

  // 1. Retrieve
  const retrieved = await retrieveContext(query, topK);
  console.log(`[RAG] Retrieved ${retrieved.length} chunks (top score=${retrieved[0]?.score?.toFixed(3) || 'n/a'})`);

  // 2. Build prompt
  const contextBlock = buildContextBlock(retrieved);
  const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.qa;

  let userPrompt;
  if (contextBlock.length > 0) {
    userPrompt =
      `SOURCE SNIPPETS:\n${contextBlock}\n\n` +
      `QUESTION / INPUT:\n${query}`;
  } else {
    // Vector DB is empty — pass query directly with a note
    userPrompt =
      `(No source material has been uploaded yet. Answer from general knowledge.)\n\n` +
      `QUESTION / INPUT:\n${query}`;
    console.log('[RAG] Warning: vector DB returned 0 results — answering without context');
  }

  // 3. Generate
  const answer = await callLLM(systemPrompt, userPrompt);
  console.log(`[RAG] Generated ${answer.length} chars`);

  const result = {
    answer,
    sources: retrieved.map((r, i) => ({
      id: i + 1,
      score: parseFloat(r.score.toFixed(4)),
      source: r.source,
      section: r.section,
      snippet: r.text.slice(0, 200) + (r.text.length > 200 ? '…' : ''),
    })),
    model: GROQ_MODEL,
  };

  if (debug) {
    result.prompt = userPrompt;
  }

  return result;
}

/**
 * RAG-powered evaluation: retrieve relevant material and use it as extra
 * grounding when scoring a student answer.
 *
 * Returns the same shape as evaluationService.evaluateAnswer() so callers
 * can use it as a drop-in alternative.
 */
async function evaluateWithRAG(studentAnswer, question = '', topK = 5) {
  const result = await query(
    `Student answer to evaluate:\n${studentAnswer}\n\nQuestion: ${question}`,
    { topK, mode: 'evaluate' }
  );

  // Try to parse JSON from the answer
  try {
    const jsonMatch = result.answer.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(100, Math.max(0, parsed.score || 0)),
        matchedConcepts: parsed.matchedConcepts || [],
        missingConcepts: parsed.missingConcepts || [],
        feedback: parsed.feedback || result.answer,
        ragSources: result.sources,
        success: true,
      };
    }
  } catch (e) {
    // fall through
  }

  return {
    score: 0,
    matchedConcepts: [],
    missingConcepts: [],
    feedback: result.answer,
    ragSources: result.sources,
    success: false,
  };
}

module.exports = {
  retrieveContext,
  query,
  evaluateWithRAG,
};
