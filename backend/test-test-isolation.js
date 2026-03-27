require('dotenv').config();
const axios = require('axios');
const BASE = 'http://localhost:5000';

(async () => {
  try {
    const login = await axios.post(BASE + '/api/auth/login', {
      email: 'teacher@test.com',
      password: 'teacher123'
    });
    const token = login.data.token;
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const t1 = await axios.post(BASE + '/api/tests', { name: `Test A ${Date.now()}` }, auth);
    const t2 = await axios.post(BASE + '/api/tests', { name: `Test B ${Date.now()}` }, auth);
    const testA = t1.data.test._id;
    const testB = t2.data.test._id;

    await axios.post(BASE + '/api/upload-material', {
      material: 'Material for Test A only. Short definition about recursion and complexity.',
      testId: testA
    }, auth);

    const qaA = await axios.post(BASE + '/api/generate-questions', {
      numQuestions: 1,
      testId: testA
    }, auth);

    let qaBError = null;
    try {
      await axios.post(BASE + '/api/generate-questions', {
        numQuestions: 1,
        testId: testB
      }, auth);
    } catch (err) {
      qaBError = err.response?.data?.error || err.message;
    }

    console.log('Test A questions:', qaA.data.questions?.length || 0);
    console.log('Test B error (expected no material):', qaBError || 'no error');

  const latestModelA = await axios.get(`${BASE}/api/upload-model-answer/latest?testId=${testA}`, auth);
  const latestModelB = await axios.get(`${BASE}/api/upload-model-answer/latest?testId=${testB}`, auth);
    console.log('Model answer for Test A found:', !!latestModelA.data?.found);
    console.log('Model answer for Test B found:', !!latestModelB.data?.found);
  } catch (err) {
    console.error('Isolation test error', err.response?.status, err.response?.data || err.message);
  }
})();
