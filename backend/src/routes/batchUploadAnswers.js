/**
 * Batch Upload Student Answers (upload-only)
 * 
 * Feature: Upload a folder of answer files (PDF/TXT/DOCX/JSON)
 * Process: Upload files now, evaluate later on demand
 * 
 * POST /api/batch-upload-answers/upload
 * Request: FormData with files[] array
 * Response: { success, totalFiles, results: [{filename, score, matched, missing, feedback}] }
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const ocrService = require('../services/ocrService');
const authMiddleware = require('../middleware/auth');
const StudentAnswer = require('../models/StudentAnswer');
const ModelAnswer = require('../models/ModelAnswer');
const EvaluationResult = require('../models/EvaluationResult');
const MarkingScheme = require('../models/MarkingScheme');
const vectorDbService = require('../services/vectorDbService');
const embeddingService = require('../services/embeddingService');
const chunkingService = require('../services/chunkingService');
const aiService = require('../services/aiService');

function buildRubricPayload(markingScheme, fallbackRubric, maxMarks) {
  if (!markingScheme) return fallbackRubric;

  const concepts = Array.isArray(markingScheme.keyConcepts) ? markingScheme.keyConcepts : [];
  const criticalErrors = Array.isArray(markingScheme.criticalErrors) ? markingScheme.criticalErrors : [];

  const conceptFirst = {
    type: 'concept_first_v1',
    text: markingScheme.rubricText || fallbackRubric || 'Standard rubric',
    maxMarks: Number(maxMarks) || Number(markingScheme.maxMarks) || 10,
    requiredConcepts: concepts.map((item) => ({
      concept: item.concept,
      weight: Number(item.marks) || 1,
      required: !!item.isRequired,
      synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
      depthLevels: {
        mention: Number(item?.depthLevels?.mention) || 1,
        explanation: Number(item?.depthLevels?.explanation) || 2,
        linkage: Number(item?.depthLevels?.linkage) || 3
      }
    })),
    criticalErrors: criticalErrors.map((err) => ({
      statement: err.statement,
      synonyms: Array.isArray(err.synonyms) ? err.synonyms : [],
      penalty: Number(err.penalty) || 1,
      explanation: err.explanation || ''
    }))
  };

  const hasAdvancedConceptFields = conceptFirst.requiredConcepts.some((c) =>
    (c.synonyms && c.synonyms.length > 0) ||
    (c.depthLevels && (c.depthLevels.explanation > 1 || c.depthLevels.linkage > 1))
  );

  if (markingScheme.conceptFirstEnabled || hasAdvancedConceptFields || conceptFirst.criticalErrors.length > 0) {
    return conceptFirst;
  }

  return markingScheme.rubricText || fallbackRubric;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/batch');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.txt', '.docx', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Use PDF, TXT, DOCX, or JSON`));
    }
  }
});

/**
 * Extract text from file based on format
 */
const extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      const extracted = data.text || '';
      if (extracted.trim().length >= 50) {
        return extracted;
      }
      console.log('[Batch] PDF text layer too short, running OCR fallback...');
    } catch (error) {
      console.error(`[Batch] Error parsing PDF: ${error.message}`);
      console.log('[Batch] Falling back to OCR for PDF...');
    }

    try {
      const ocrText = await ocrService.extractText(filePath);
      return ocrText;
    } catch (ocrError) {
      console.error(`[Batch] OCR failed: ${ocrError.message}`);
      throw new Error(`Failed to parse PDF: ${ocrError.message}`);
    }
  }
  
  if (ext === '.txt') {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error(`[Batch] Error reading TXT: ${error.message}`);
      throw new Error(`Failed to read TXT: ${error.message}`);
    }
  }
  
  if (ext === '.json') {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data.answer || data.text || JSON.stringify(data);
    } catch (error) {
      console.error(`[Batch] Error parsing JSON: ${error.message}`);
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }
  
  if (ext === '.docx') {
    // For DOCX, we'd need a library like mammoth
    // For now, return error asking to convert to PDF/TXT
    throw new Error('DOCX support coming soon. Please convert to PDF or TXT.');
  }
  
  throw new Error(`Unsupported file type: ${ext}`);
};

/**
 * POST /api/batch-upload-answers
 * 
 * Upload multiple answer files and evaluate them one-by-one
 * 
 * Form Data:
 *   - files: Array of files to process
 *   - maxScore: Maximum score for rubric (default: 100)
 * 
 * Returns:
 *   {
 *     success: true,
 *     totalFiles: 5,
 *     processedFiles: 5,
 *     failedFiles: 0,
 *     results: [
 *       {
 *         filename: "student1.pdf",
 *         status: "completed",
 *         score: 85,
 *         maxScore: 100,
 *         percentage: 85,
 *         matchedConcepts: ["concept1", "concept2"],
 *         missingConcepts: ["concept3"],
 *         feedback: "Good understanding...",
 *         evaluationId: "id123",
 *         processingTime: 2.5,
 *         error: null
 *       }
 *     ],
 *     summary: {
 *       averageScore: 82,
 *       highestScore: 92,
 *       lowestScore: 65,
 *       totalTime: 15.3
 *     }
 *   }
 */
const handleBatchUploadOnly = async (req, res) => {
  const startTime = Date.now();
  const teacherId = req.user.id;
  const { testId } = req.body || {};
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const batchName = req.body.batchName || `Batch ${new Date().toLocaleString()}`;

  console.log(`[Batch Upload] Starting batch upload for teacher ${teacherId}`);
  console.log(`[Batch Upload] Batch ID: ${batchId}`);
  console.log(`[Batch Upload] Files received: ${req.files.length}`);

  if (!testId) {
    return res.status(400).json({ success: false, error: 'Select a test before batch uploading answers' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No files uploaded'
    });
  }

  try {
    const results = [];
    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileStartTime = Date.now();
      const result = {
        filename: file.originalname,
        status: 'uploaded',
        studentAnswerId: null,
        processingTime: 0,
        error: null
      };

      try {
        console.log(`[Batch Upload] Uploading file ${i + 1}/${req.files.length}: ${file.originalname}`);

        const studentAnswerText = await extractTextFromFile(file.path);
        if (!studentAnswerText || studentAnswerText.trim().length === 0) {
          throw new Error('File contains no readable text');
        }

        const studentAnswer = await StudentAnswer.create({
          teacherId,
          testId,
          studentName: file.originalname.replace(/\.[^/.]+$/, ''),
          studentAnswer: studentAnswerText.substring(0, 5000),
          originalFilename: file.originalname,
          batchId,
          batchName,
          status: 'uploaded'
        });

        result.studentAnswerId = studentAnswer._id.toString();
        result.processingTime = (Date.now() - fileStartTime) / 1000;
        uploadedCount++;
      } catch (error) {
        console.error(`[Batch Upload] Error uploading ${file.originalname}: ${error.message}`);
        result.status = 'failed';
        result.error = error.message;
        result.processingTime = (Date.now() - fileStartTime) / 1000;
        failedCount++;
      } finally {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.log(`[Batch Upload] Could not delete temp file: ${file.path}`);
        }
      }

      results.push(result);
    }

    const summary = {
      totalFiles: req.files.length,
      uploadedFiles: uploadedCount,
      failedFiles: failedCount,
      totalTime: (Date.now() - startTime) / 1000
    };

    res.json({
      success: true,
      batchId,
      batchName,
      results,
      summary
    });
  } catch (error) {
    console.error(`[Batch Upload] Fatal error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

router.post('/batch-upload-answers/upload', authMiddleware, upload.array('files', 100), handleBatchUploadOnly);
// Backward-compatible route
router.post('/batch-upload-answers', authMiddleware, upload.array('files', 100), handleBatchUploadOnly);

router.post('/batch-upload-answers/evaluate', authMiddleware, async (req, res) => {
  const startTime = Date.now();
  const teacherId = req.user.id;
  const { testId, batchId } = req.body || {};
  const maxScore = parseInt(req.body.maxScore) || 100;

  if (!testId) {
    return res.status(400).json({ success: false, error: 'Select a test before evaluating batch answers' });
  }

  try {
    let resolvedBatchId = String(batchId || '').trim();
    let autoDetectedBatch = false;

    if (!resolvedBatchId) {
      const latestPending = await StudentAnswer.findOne({
        teacherId,
        testId,
        batchId: { $ne: null },
        status: { $in: ['uploaded', 'failed'] }
      })
        .sort({ createdAt: -1 })
        .select('batchId')
        .lean();

      if (latestPending?.batchId) {
        resolvedBatchId = latestPending.batchId;
        autoDetectedBatch = true;
      } else {
        const latestAnyBatch = await StudentAnswer.findOne({
          teacherId,
          testId,
          batchId: { $ne: null }
        })
          .sort({ createdAt: -1 })
          .select('batchId')
          .lean();

        if (latestAnyBatch?.batchId) {
          resolvedBatchId = latestAnyBatch.batchId;
          autoDetectedBatch = true;
        }
      }
    }

    if (!resolvedBatchId) {
      return res.status(400).json({ success: false, error: 'No uploaded batch answers found for this test.' });
    }

    const modelAnswer = await ModelAnswer.findOne({ teacherId, testId }).sort({ createdAt: -1 });
    if (!modelAnswer) {
      return res.status(400).json({ success: false, error: 'Upload a model answer before batch evaluation' });
    }

    const initialStudentFilter = {
      teacherId,
      testId,
      batchId: resolvedBatchId,
      status: { $in: ['uploaded', 'failed'] }
    };

    let students = await StudentAnswer.find(initialStudentFilter).sort({ createdAt: 1 });
    if (!students.length) {
      students = await StudentAnswer.find({ teacherId, testId, batchId: resolvedBatchId }).sort({ createdAt: 1 });
    }

    if (!students.length) {
      return res.status(400).json({ success: false, error: 'No uploaded answers found for this batch' });
    }

    const markingScheme = await MarkingScheme.findOne({
      teacherId,
      questionText: modelAnswer.questionText
    });
  const rubricPayload = buildRubricPayload(markingScheme, markingScheme ? markingScheme.rubricText : null, maxScore);

    const modelChunks = chunkingService.chunkAnswerForEvaluation(
      modelAnswer.modelAnswer,
      modelAnswer._id.toString()
    );
    const filteredModelChunks = chunkingService.filterChunks(modelChunks, minLength = 10);
    if (filteredModelChunks.length > 0) {
      const modelChunkTexts = filteredModelChunks.map(chunk => chunk.text);
      const modelEmbeddings = await embeddingService.generateBatchEmbeddings(modelChunkTexts);
      vectorDbService.addAnswerEmbeddings(
        modelEmbeddings,
        filteredModelChunks.map((chunk) => ({
          text: chunk.text,
          questionId: modelAnswer._id.toString(),
          maxScore,
          testId
        }))
      );
    }

    const results = [];
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const fileStartTime = Date.now();
      const result = {
        filename: student.originalFilename || student.studentName,
        status: 'processing',
        score: null,
        maxScore,
        percentage: null,
        matchedConcepts: [],
        missingConcepts: [],
        feedback: '',
        evaluationId: null,
        processingTime: 0,
        error: null
      };

      try {
        const studentEmbedding = await embeddingService.generateEmbedding(student.studentAnswer);
        const retrievedChunks = vectorDbService.queryAnswers(studentEmbedding, 5, testId);
        const evaluation = await aiService.evaluateAnswerWithRetrieval(
          modelAnswer.questionText || 'General Question',
          retrievedChunks.length > 0
            ? retrievedChunks
            : [{ text: modelAnswer.modelAnswer, questionId: modelAnswer._id }],
          student.studentAnswer,
          maxScore,
          rubricPayload
        );

        if (!evaluation) {
          throw new Error('Invalid evaluation response from LLM');
        }

        // Defensive numeric coercion: prefer evaluation.score, fallback to marks_breakdown.total
        let numericScore = Number(evaluation.score);
        if (!Number.isFinite(numericScore)) {
          numericScore = Number(evaluation.marks_breakdown && evaluation.marks_breakdown.total);
        }
        if (!Number.isFinite(numericScore)) numericScore = 0;

        const evaluationPayload = {
          teacherId,
          testId,
          studentName: student.studentName || 'Anonymous',
          questionText: modelAnswer.questionText || '',
          modelAnswer: modelAnswer.modelAnswer,
          studentAnswer: student.studentAnswer,
          marks: numericScore,
          maxMarks: maxScore,
          matchedConcepts: evaluation.matched_concepts || [],
          missingConcepts: evaluation.missing_concepts || [],
          feedback: evaluation.feedback || 'Evaluation completed',
          evaluationMethod: 'vector_retrieval_llm',
          batchId: resolvedBatchId,
          batchName: student.batchName || null,
          markingSchemeId: markingScheme ? markingScheme._id : null,
          marksBreakdown: evaluation.marks_breakdown || {}
        };

        const evaluationResult = await EvaluationResult.findOneAndUpdate(
          {
            teacherId,
            testId,
            batchId: resolvedBatchId,
            studentName: student.studentName || 'Anonymous'
          },
          { $set: evaluationPayload },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
          }
        );

        await StudentAnswer.updateOne({ _id: student._id }, { $set: { status: 'evaluated' } });

        result.status = 'completed';
        // Return both legacy and normalized fields to keep frontend clients working
        result.score = numericScore;
        result.marks = numericScore;
        result.percentage = Math.round((numericScore / maxScore) * 100);
        result.matchedConcepts = evaluation.matched_concepts || [];
        result.missingConcepts = evaluation.missing_concepts || [];
        result.feedback = evaluation.feedback || '';
        result.evaluationId = evaluationResult._id.toString();
        result.processingTime = (Date.now() - fileStartTime) / 1000;
        processedCount++;
      } catch (error) {
        console.error(`[Batch Evaluate] Error processing ${student.studentName}: ${error.message}`);
        await StudentAnswer.updateOne({ _id: student._id }, { $set: { status: 'failed' } });
        result.status = 'failed';
        result.error = error.message;
        result.processingTime = (Date.now() - fileStartTime) / 1000;
        failedCount++;
      }

      results.push(result);
    }

    const completedResults = results.filter(r => r.status === 'completed');
    const scores = completedResults.map(r => r.score);

    const summary = {
      totalFiles: students.length,
      processedFiles: processedCount,
      failedFiles: failedCount,
      averageScore: completedResults.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      highestScore: completedResults.length > 0 ? Math.max(...scores) : 0,
      lowestScore: completedResults.length > 0 ? Math.min(...scores) : 0,
      totalTime: (Date.now() - startTime) / 1000
    };

    res.json({
      success: true,
      batchId: resolvedBatchId,
      autoDetectedBatch,
      results,
      summary
    });
  } catch (error) {
    console.error(`[Batch Evaluate] Fatal error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/batch-upload-answers/status/:batchId
 * 
 * Get status of batch upload (for long-running batches)
 * Currently returns summary, can be extended for progress tracking
 */
router.get('/batch-upload-answers/status/:batchId', authMiddleware, async (req, res) => {
  try {
    const evaluations = await EvaluationResult.find({
      teacherId: req.user.id,
      createdAt: {
        $gte: new Date(Date.now() - 1 * 60 * 60 * 1000) // Last 1 hour
      }
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      recentEvaluations: evaluations.length,
      latest: evaluations[0] || null
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
