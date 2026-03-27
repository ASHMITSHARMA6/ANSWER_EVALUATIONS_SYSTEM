require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize Vector DB
const vectorDbService = require('./services/vectorDbService');
vectorDbService.initializeVectorDB();

const authRoutes = require('./routes/auth');
const uploadMaterialRoutes = require('./routes/uploadMaterial');
const generateQuestionsRoutes = require('./routes/generateQuestions');
const uploadModelAnswerRoutes = require('./routes/uploadModelAnswer');
const uploadStudentAnswerRoutes = require('./routes/uploadStudentAnswer');
const evaluateAnswerRoutes = require('./routes/evaluateAnswer');
const resultsRoutes = require('./routes/results');
const testsRoutes = require('./routes/tests');
const batchUploadAnswersRoutes = require('./routes/batchUploadAnswers');
const markingSchemesRoutes = require('./routes/markingSchemes');
const extractPdfRoutes = require('./routes/extractPdf');
const ocrEvaluationRoutes = require('./routes/ocrEvaluationRoutes');
const ragRoutes = require('./routes/ragRoutes');
const materialLibraryRoutes = require('./routes/materialLibrary');
const questionPaperRoutes = require('./routes/questionPaper');

connectDB();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// NOTE: Do NOT use express-fileupload globally — it conflicts with multer
// used in uploadMaterial, batchUploadAnswers, and ocrEvaluation routes.
// Only markingSchemes uses express-fileupload and handles it locally.

// Auth (no middleware)
app.use('/api/auth', authRoutes);
app.use('/api/tests', testsRoutes);

// Protected API (auth required)
app.use('/api/upload-material', uploadMaterialRoutes);
app.use('/api/generate-questions', generateQuestionsRoutes);
app.use('/api/upload-model-answer', uploadModelAnswerRoutes);
app.use('/api/upload-student-answer', uploadStudentAnswerRoutes);
app.use('/api/evaluate-answer', evaluateAnswerRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/marking-schemes', markingSchemesRoutes);
app.use('/api/extract-pdf', extractPdfRoutes);
app.use('/api', batchUploadAnswersRoutes);
app.use('/api/material-library', materialLibraryRoutes);
app.use('/api/question-paper', questionPaperRoutes);

// OCR & Evaluation Routes (open access)
app.use('/api/ocr', ocrEvaluationRoutes);
app.use('/api/evaluate', ocrEvaluationRoutes);

// RAG Routes (open access)
app.use('/api/rag', ragRoutes);

// Health
app.get('/api/health', (req, res) => {
  const vectorStats = vectorDbService.getStats();
  res.json({ 
    ok: true,
    vectorDb: vectorStats,
    timestamp: new Date().toISOString()
  });
});

// Vector DB stats (debugging)
app.get('/api/debug/vector-db-stats', (req, res) => {
  res.json(vectorDbService.getStats());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
