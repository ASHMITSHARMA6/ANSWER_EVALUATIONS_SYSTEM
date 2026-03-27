require('dotenv').config();
const axios = require('axios');
const BASE = 'http://localhost:5000';

async function test(name, fn) {
  try {
    const r = await fn();
    console.log('✅', name, typeof r === 'object' ? JSON.stringify(r).slice(0, 120) : r);
  } catch (e) {
    console.log('❌', name, e.response?.status || e.code, (e.response?.data?.error || e.message).toString().slice(0, 100));
  }
}

(async () => {
  // 1. Health
  await test('Health', async () => {
    const r = await axios.get(BASE + '/api/health');
    return r.data;
  });

  // 2. VectorDB stats (via health endpoint)
  await test('VectorDB stats', async () => {
    const r = await axios.get(BASE + '/api/health');
    return { material: r.data.vectorDb?.material?.size, answers: r.data.vectorDb?.answers?.size };
  });

  // 3. Auth login
  await test('Auth login', async () => {
    const r = await axios.post(BASE + '/api/auth/login', {
      email: 'teacher@test.com',
      password: 'teacher123',
    });
    return { token: r.data.token ? 'present' : 'missing' };
  });

  // 4. Evaluate text (uses Groq only now)
  await test('Evaluate text', async () => {
    const r = await axios.post(BASE + '/api/evaluate/text', {
      studentAnswer: 'RAG combines retrieval with generation',
      modelAnswer:
        'RAG is Retrieval-Augmented Generation that combines document retrieval with text generation',
      question: 'What is RAG?',
    });
    return { score: r.data.result?.score, success: r.data.result?.success };
  });

  // 5. RAG query
  await test('RAG query', async () => {
    const r = await axios.post(BASE + '/api/rag/query', {
      query: 'What is machine learning?',
    });
    return { hasAnswer: !!r.data.answer, sources: r.data.sources?.length || 0 };
  });

  // 6. Embedding info (should show "Deterministic Hash", no HuggingFace)
  await test('Embedding info', async () => {
    const embSvc = require('./src/services/embeddingService');
    return embSvc.getEmbeddingInfo();
  });

  console.log('\n--- All tests complete ---');
})();
