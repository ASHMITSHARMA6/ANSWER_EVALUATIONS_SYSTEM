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
    console.log('login ok', !!token);

    const res = await axios.post(
      BASE + '/api/generate-questions',
      { numQuestions: 2 },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('questions', res.data.questions?.length);
    console.log('modelAnswers', res.data.modelAnswers?.length);
    console.log('pairs', res.data.questionPairs?.length);
    console.log('sample', res.data.questionPairs?.[0]);
  } catch (e) {
    console.error('err', e.response?.status, e.response?.data || e.message);
  }
})();
