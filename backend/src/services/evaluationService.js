/**
 * AI Evaluation Service
 * Evaluates student answers (including OCR-extracted handwritten text) against model answers
 * Uses Groq LLM for semantic evaluation with vector-based retrieval
 */

const axios = require('axios');

/**
 * Evaluate student answer against model answer using AI
 * @param {string} studentAnswer - Student's answer text (including OCR-extracted)
 * @param {string} modelAnswer - Teacher's model answer
 * @param {string} question - The question being answered
 * @returns {Promise<object>} - Evaluation result with score and feedback
 */
async function evaluateAnswer(studentAnswer, modelAnswer, question = '') {
  try {
    if (!studentAnswer || !modelAnswer) {
      throw new Error('Student answer and model answer are required');
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    // Create evaluation prompt
    const evaluationPrompt = createEvaluationPrompt(
      studentAnswer,
      modelAnswer,
      question
    );

    const evaluation = await evaluateWithGroq(evaluationPrompt);

    return parseEvaluationResponse(evaluation);
  } catch (error) {
    console.error('[Evaluation] Error:', error.message);
    throw error;
  }
}

/**
 * Create evaluation prompt for AI
 */
function createEvaluationPrompt(studentAnswer, modelAnswer, question) {
  return `You are an expert teacher evaluating student answers.

${question ? `QUESTION: ${question}\n` : ''}
MODEL ANSWER (correct answer):
${modelAnswer}

STUDENT ANSWER (to evaluate):
${studentAnswer}

Evaluate the student answer and provide:
1. A score from 0-100
2. Matched concepts (what the student got correct)
3. Missing concepts (what the student missed)
4. Specific feedback for improvement

Format your response as JSON:
{
  "score": <0-100>,
  "matchedConcepts": ["concept1", "concept2"],
  "missingConcepts": ["concept1", "concept2"],
  "feedback": "Detailed feedback for the student"
}`;
}

/**
 * Evaluate using Groq API
 */
async function evaluateWithGroq(prompt) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert teacher. Provide evaluations in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0, // Deterministic scoring
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('[Groq Evaluation] Error:', error.message);
    throw error;
  }
}

/**
 * Parse AI evaluation response
 */
function parseEvaluationResponse(response) {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.score || 0,
        matchedConcepts: parsed.matchedConcepts || [],
        missingConcepts: parsed.missingConcepts || [],
        feedback: parsed.feedback || 'No feedback available',
        success: true,
      };
    }

    // Fallback parsing
    const scoreMatch = response.match(/score["\s:]*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

    return {
      score: Math.min(100, Math.max(0, score)),
      matchedConcepts: [],
      missingConcepts: [],
      feedback: response,
      success: false,
    };
  } catch (error) {
    console.error('[Parse Evaluation] Error:', error.message);
    return {
      score: 0,
      matchedConcepts: [],
      missingConcepts: [],
      feedback: 'Error parsing evaluation',
      success: false,
    };
  }
}

module.exports = {
  evaluateAnswer,
};
