/**
 * Batch Upload & Evaluate Student Answers
 * 
 * Feature: Upload a folder of answer files (PDF/TXT/DOCX/JSON)
 * Process: One-by-one evaluation with real-time progress
 * 
 * POST /api/batch-upload-answers
 * Request: FormData with files[] array
 * Response: { success, totalFiles, results: [{filename, score, matched, missing, feedback}] }
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const authMiddleware = require('../middleware/auth');
const StudentAnswer = require('../models/StudentAnswer');
const ModelAnswer = require('../models/ModelAnswer');
const EvaluationResult = require('../models/EvaluationResult');
const vectorDbService = require('../services/vectorDbService');
const embeddingService = require('../services/embeddingService');
const chunkingService = require('../services/chunkingService');
const aiService = require('../services/aiService');

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
      return data.text;
    } catch (error) {
      console.error(`[Batch] Error parsing PDF: ${error.message}`);
      throw new Error(`Failed to parse PDF: ${error.message}`);
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
router.post('/batch-upload-answers', authMiddleware, upload.array('files', 100), async (req, res) => {
  const startTime = Date.now();
  const teacherId = req.user.id;
  const { testId } = req.body || {};
  const maxScore = parseInt(req.body.maxScore) || 100;
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const batchName = req.body.batchName || `Batch ${new Date().toLocaleString()}`;
  
  console.log(`[Batch Upload] Starting batch evaluation for teacher ${teacherId}`);
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
    // Verify model answer exists
    console.log(`[Batch Upload] Looking for model answer for teacher: ${teacherId}`);
    const modelAnswer = await ModelAnswer.findOne({ teacherId, testId })
      .sort({ createdAt: -1 });
    
    if (!modelAnswer) {
      console.error(`[Batch Upload] ❌ No model answer found for teacher: ${teacherId}`);
      return res.status(400).json({
        success: false,
        error: '❌ Please upload a Model Answer first before batch uploading student answers'
      });
    }
    
    console.log(`[Batch Upload] ✅ Model answer found for evaluation`);
    
  console.log(`[Batch Upload] Model answer found: "${(modelAnswer.questionText || '').substring(0, 50)}..."`);
    
    const results = [];
    let processedCount = 0;
    let failedCount = 0;
    
    // Process each file sequentially
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileStartTime = Date.now();
      const result = {
        filename: file.originalname,
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
        console.log(`[Batch Upload] Processing file ${i + 1}/${req.files.length}: ${file.originalname}`);
        
        // 1. Extract text from file
        const studentAnswerText = await extractTextFromFile(file.path);
        
        if (!studentAnswerText || studentAnswerText.trim().length === 0) {
          throw new Error('File contains no readable text');
        }
        
        console.log(`[Batch Upload] Text extracted: ${studentAnswerText.length} chars`);
        
        // 2. Save student answer to database
        const studentAnswer = await StudentAnswer.create({
          teacherId,
          testId,
          studentName: file.originalname.replace(/\.[^/.]+$/, ''),
          studentAnswer: studentAnswerText.substring(0, 5000)
        });

        console.log(`[Batch Upload] Student answer saved: ${studentAnswer._id}`);

        // 3. Chunk model answer (if not already done)
        const modelChunks = chunkingService.chunkAnswerForEvaluation(
          modelAnswer.modelAnswer,
          modelAnswer._id.toString()
        );

        console.log(`[Batch Upload] Model answer chunked: ${modelChunks.length} chunks`);

        // 4. Generate embeddings for model chunks
        const modelChunkTexts = modelChunks.map(chunk => chunk.text);
        console.log(`[Batch Upload] Generating embeddings for ${modelChunkTexts.length} chunks...`);
        let modelEmbeddings;
        try {
          modelEmbeddings = await embeddingService.generateBatchEmbeddings(modelChunkTexts);
        } catch (embErr) {
          console.error(`[Batch Upload] ❌ Embedding generation failed: ${embErr.message}`);
          throw new Error(`Failed to generate embeddings: ${embErr.message}`);
        }

        if (!modelEmbeddings || modelEmbeddings.length === 0) {
          throw new Error('No embeddings generated for model chunks');
        }

        console.log(`[Batch Upload] ✅ Model embeddings generated: ${modelEmbeddings.length}`);

        // 5. Add to vector DB answers index
        vectorDbService.addAnswerEmbeddings(
          modelEmbeddings,
          modelChunks.map((chunk) => ({
            text: chunk.text,
            questionId: modelAnswer._id.toString(),
            maxScore,
            testId
          }))
        );

        console.log(`[Batch Upload] Embeddings added to vector DB`);

        // 6. Generate embedding for student answer
        const studentEmbedding = await embeddingService.generateEmbedding(studentAnswerText);

        // 7. Query vector DB for similar chunks
        const retrievedChunks = vectorDbService.queryAnswers(studentEmbedding, 5, testId);

        console.log(`[Batch Upload] Retrieved ${retrievedChunks.length} similar chunks`);

        if (retrievedChunks.length === 0) {
          throw new Error('Could not retrieve relevant context from model answer');
        }

        // 8. Build evaluation context
        const retrievedContext = retrievedChunks
          .map(chunk => chunk.text)
          .join('\n\n');
        
        // 9. Call LLM for evaluation
        console.log(`[Batch Upload] Calling LLM for evaluation...`);
        let evaluation;
        try {
          evaluation = await aiService.evaluateAnswerWithRetrieval(
            modelAnswer.questionText || 'General Question',
            retrievedChunks,
            studentAnswerText,
            maxScore,
            null // Use default rubric
          );
        } catch (evalErr) {
          throw new Error(`LLM evaluation failed: ${evalErr.message}`);
        }

        if (!evaluation || evaluation.score === undefined) {
          throw new Error('Invalid evaluation response from LLM');
        }

        console.log(`[Batch Upload] Evaluation complete: ${evaluation.score}/${maxScore}`);

        // 10. Save evaluation to database
        const evaluationResult = await EvaluationResult.create({
          teacherId,
          testId,
          studentName: file.originalname.replace(/\.[^/.]+$/, ''),
          questionText: modelAnswer.questionText || '',
          modelAnswer: modelAnswer.modelAnswer,
          studentAnswer: studentAnswerText,
          marks: evaluation.score,
          maxMarks: maxScore,
          matchedConcepts: evaluation.matchedConcepts || [],
          missingConcepts: evaluation.missingConcepts || [],
          feedback: evaluation.feedback || 'Evaluation completed',
          evaluationMethod: 'vector_retrieval_llm',
          batchId,
          batchName
        });

        result.status = 'completed';
        result.score = evaluation.score;
        result.percentage = Math.round((evaluation.score / maxScore) * 100);
        result.matchedConcepts = evaluation.matchedConcepts || [];
        result.missingConcepts = evaluation.missingConcepts || [];
        result.feedback = evaluation.feedback || '';
        result.evaluationId = evaluationResult._id.toString();
        result.processingTime = (Date.now() - fileStartTime) / 1000;

        processedCount++;
        
      } catch (error) {
        console.error(`[Batch Upload] Error processing ${file.originalname}: ${error.message}`);
        result.status = 'failed';
        result.error = error.message;
        result.processingTime = (Date.now() - fileStartTime) / 1000;
        failedCount++;
      } finally {
        // Clean up uploaded file
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.log(`[Batch Upload] Could not delete temp file: ${file.path}`);
        }
      }
      
      results.push(result);
    }
    
    // Calculate summary statistics
    const completedResults = results.filter(r => r.status === 'completed');
    const scores = completedResults.map(r => r.score);
    
    const summary = {
      totalFiles: req.files.length,
      processedFiles: processedCount,
      failedFiles: failedCount,
      averageScore: completedResults.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      highestScore: completedResults.length > 0 ? Math.max(...scores) : 0,
      lowestScore: completedResults.length > 0 ? Math.min(...scores) : 0,
      totalTime: (Date.now() - startTime) / 1000
    };
    
    console.log(`[Batch Upload] Complete. Processed: ${processedCount}, Failed: ${failedCount}`);
    console.log(`[Batch Upload] Summary:`, summary);
    
    res.json({
      success: true,
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
      userId: req.user.id,
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
