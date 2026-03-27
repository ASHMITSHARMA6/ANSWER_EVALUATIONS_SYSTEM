// Utility to call OpenAI API for question generation
const axios = require('axios');

function generateFallbackQuestionsFromMaterial(material, numQuestions) {
  // Simple heuristic fallback: pick long sentences and craft deep prompts around them
  const sentences = (material || '').split(/[\.\!\?]\s+/).map(s => s.trim()).filter(s => s.length > 40);
  if (sentences.length === 0) {
    // if no long sentences, split by lines
    const lines = (material || '').split(/\n+/).map(l => l.trim()).filter(l => l.length > 40);
    if (lines.length > 0) sentences.push(...lines);
  }

  const templates = [
    (s) => `Explain the meaning and implications of the following statement from the material: "${s}". Provide a detailed analysis referencing the material.`,
    (s) => `Identify the assumptions or premises behind: "${s}" and critically evaluate their validity in the context of the material.`,
    (s) => `Discuss how the idea in the statement "${s}" connects to other concepts in the material and why it matters.`,
    (s) => `Provide a concrete example or application for the concept expressed in: "${s}" and explain its significance.`,
    (s) => `Formulate a counter-argument to the claim made in: "${s}" and defend your position using information from the material.`
  ];

  const result = [];
  for (let i = 0; i < numQuestions; i++) {
    const s = sentences.length > 0 ? sentences[i % sentences.length] : (material || '').slice(0, 120);
    const tpl = templates[i % templates.length];
    result.push(tpl(s));
  }
  return result;
}

async function generateQuestionsWithOpenAI(material, numQuestions = 5) {
  const apiKey = process.env.OPENAI_API_KEY || 'sk-proj-YOUR_OPENAI_API_KEY';
  const maxRetries = 3;

  const prompt = `You are an expert educator. Based on the following study material, generate exactly ${numQuestions} deeply relevant, thoughtful, and specific exam-style questions that test deep understanding.\n\nIMPORTANT:\n- Each question must be directly tied to specific concepts, examples, or ideas in the material\n- Questions should be challenging and require critical thinking\n- Do NOT ask generic questions like \"What is the main idea?\"\n- Make questions specific to the actual content provided\n- Number each question\n\nStudy Material:\n${material}\n\nGenerate ${numQuestions} deep, specific, and relevant questions:`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an expert educator who creates deep, relevant, and specific exam questions based on study material.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      const text = response.data.choices[0].message.content.trim();
      const questions = text.split(/\n?\d+\.\s+/).filter(q => q.trim().length > 10);
      if (questions.length > numQuestions) {
        return questions.slice(1, numQuestions + 1);
      }
      return questions.slice(0, numQuestions);
    } catch (err) {
      const status = err.response?.status;
      console.error(`AI generateQuestions error (attempt ${attempt + 1}):`, err.response?.data || err.message);
      // If rate limit / quota error, retry with backoff
      if (status === 429) {
        const backoff = 500 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      // For other errors, break and fallback
      break;
    }
  }

  // If we reach here, OpenAI failed (possibly quota). Return heuristic fallback questions tied to material.
  return generateFallbackQuestionsFromMaterial(material, numQuestions);
}

module.exports = generateQuestionsWithOpenAI;
