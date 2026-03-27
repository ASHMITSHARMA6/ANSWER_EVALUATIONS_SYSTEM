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

    const testRes = await axios.post(BASE + '/api/tests', { name: `Test ${Date.now()}` }, auth);
    const testId = testRes.data.test._id;
    console.log('testId', testId);

    await axios.post(BASE + '/api/upload-material', { material: 'This is sample material about recursion and time complexity.', testId }, auth);

    const questions = await axios.post(
      BASE + '/api/generate-questions',
      { numQuestions: 1, testId },
      auth
    );

    console.log('questions', questions.data.questions?.length, 'pairs', questions.data.questionPairs?.length);
  } catch (err) {
    console.error('error', err.response?.status, err.response?.data || err.message);
  }
})();
