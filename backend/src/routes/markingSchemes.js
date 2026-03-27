/**
 * Marking Scheme Routes
 * 
 * POST /api/marking-schemes - Create/update marking scheme
 * GET /api/marking-schemes - Get all marking schemes for teacher
 * GET /api/marking-schemes/:id - Get specific marking scheme
 * PUT /api/marking-schemes/:id - Update marking scheme
 * DELETE /api/marking-schemes/:id - Delete marking scheme
 * GET /api/marking-schemes/question/:questionText - Find scheme by question
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MarkingScheme = require('../models/MarkingScheme');

// express-fileupload for PDF upload route (used locally, not globally)
const fileUpload = require('express-fileupload');
const fileUploadMiddleware = fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  abortOnLimit: true,
  useTempFiles: false
});

/**
 * POST /api/marking-schemes
 * Create or update marking scheme for a question
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      schemeTitle,
      questions = [],
      description,
      keyConcepts = [],
      markingLevels = [],
      commonMistakes = [],
      bonusMarks = [],
      // Legacy support
      questionText,
      maxMarks = 10
    } = req.body;

    // Support both new format (with questions array) and old format (single question)
    let finalTitle = schemeTitle || questionText;
    
    if (!finalTitle || !finalTitle.trim()) {
      return res.status(400).json({ error: 'Scheme title or question text is required' });
    }

    // Check if marking scheme already exists for this title
    const existing = await MarkingScheme.findOne({
      teacherId: req.user._id,
      questionText: finalTitle.trim()
    });

    let markingScheme;

    if (existing) {
      // Update existing
      markingScheme = await MarkingScheme.findByIdAndUpdate(
        existing._id,
        {
          questionText: finalTitle.trim(),
          maxMarks: questions.length > 0 ? questions.reduce((sum, q) => sum + q.marks, 0) : maxMarks,
          description,
          keyConcepts,
          markingLevels,
          commonMistakes,
          bonusMarks,
          updatedAt: Date.now()
        },
        { new: true }
      );
    } else {
      // Create new
      markingScheme = await MarkingScheme.create({
        teacherId: req.user._id,
        questionText: finalTitle.trim(),
        maxMarks: questions.length > 0 ? questions.reduce((sum, q) => sum + q.marks, 0) : maxMarks,
        description,
        keyConcepts,
        markingLevels,
        commonMistakes,
        bonusMarks,
        questions: questions.length > 0 ? questions : undefined
      });
    }

    res.json({
      success: true,
      message: existing ? 'Marking scheme updated' : 'Marking scheme created',
      scheme: markingScheme,
      rubric: markingScheme.rubricText
    });
  } catch (err) {
    console.error('[Marking Scheme] Create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/marking-schemes
 * Get all marking schemes for teacher
 */
router.get('/', auth, async (req, res) => {
  try {
    const schemes = await MarkingScheme.find({ teacherId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    // Add rubric text for each scheme
    const schemesWithRubric = schemes.map(scheme => ({
      ...scheme.toObject(),
      rubric: scheme.rubricText
    }));

    res.json({
      success: true,
      count: schemes.length,
      schemes: schemesWithRubric
    });
  } catch (err) {
    console.error('[Marking Scheme] Get all error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/marking-schemes/:id
 * Get specific marking scheme
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const scheme = await MarkingScheme.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!scheme) {
      return res.status(404).json({ error: 'Marking scheme not found' });
    }

    res.json({
      success: true,
      scheme: scheme.toObject(),
      rubric: scheme.rubricText
    });
  } catch (err) {
    console.error('[Marking Scheme] Get one error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/marking-schemes/question/:questionText
 * Find marking scheme by question text
 */
router.get('/question/:questionText', auth, async (req, res) => {
  try {
    const questionText = decodeURIComponent(req.params.questionText);
    
    const scheme = await MarkingScheme.findOne({
      teacherId: req.user._id,
      questionText: questionText.trim()
    });

    if (!scheme) {
      return res.status(404).json({
        success: false,
        scheme: null,
        message: 'No marking scheme found for this question'
      });
    }

    res.json({
      success: true,
      scheme: scheme.toObject(),
      rubric: scheme.rubricText
    });
  } catch (err) {
    console.error('[Marking Scheme] Get by question error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/marking-schemes/:id
 * Update marking scheme
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const scheme = await MarkingScheme.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!scheme) {
      return res.status(404).json({ error: 'Marking scheme not found' });
    }

    const {
      questionText,
      maxMarks,
      description,
      keyConcepts,
      markingLevels,
      commonMistakes,
      bonusMarks
    } = req.body;

    // Update fields if provided
    if (questionText) scheme.questionText = questionText.trim();
    if (maxMarks) scheme.maxMarks = maxMarks;
    if (description) scheme.description = description;
    if (keyConcepts) scheme.keyConcepts = keyConcepts;
    if (markingLevels) scheme.markingLevels = markingLevels;
    if (commonMistakes) scheme.commonMistakes = commonMistakes;
    if (bonusMarks) scheme.bonusMarks = bonusMarks;

    await scheme.save();

    res.json({
      success: true,
      message: 'Marking scheme updated',
      scheme: scheme.toObject(),
      rubric: scheme.rubricText
    });
  } catch (err) {
    console.error('[Marking Scheme] Update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/marking-schemes/:id
 * Delete marking scheme
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const scheme = await MarkingScheme.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!scheme) {
      return res.status(404).json({ error: 'Marking scheme not found' });
    }

    res.json({
      success: true,
      message: 'Marking scheme deleted',
      scheme: scheme
    });
  } catch (err) {
    console.error('[Marking Scheme] Delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/marking-schemes/:id/upload-pdf
 * Upload and extract marking scheme from PDF
 */
router.post('/:id/upload-pdf', auth, fileUploadMiddleware, async (req, res) => {
  try {
    const pdfParse = require('pdf-parse');
    
    console.log('[MarkingScheme] PDF upload request received');
    console.log('[MarkingScheme] req.files:', req.files ? Object.keys(req.files) : 'undefined');
    console.log('[MarkingScheme] Scheme ID:', req.params.id);
    
    if (!req.files || !req.files.pdf) {
      console.error('[MarkingScheme] No PDF file in request');
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const pdfFile = req.files.pdf;
    console.log('[MarkingScheme] PDF file received:', pdfFile.name, 'Size:', pdfFile.size);
    
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    if (pdfFile.size > maxFileSize) {
      return res.status(400).json({ error: 'PDF file is too large (max 5MB)' });
    }

    // Parse PDF
    const pdfData = await pdfParse(pdfFile.data);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    // Find and update marking scheme
    const scheme = await MarkingScheme.findOne({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!scheme) {
      return res.status(404).json({ error: 'Marking scheme not found' });
    }

    // Store PDF information
    scheme.pdfMarkingScheme = {
      fileName: pdfFile.name,
      extractedText: extractedText,
      uploadedAt: Date.now(),
      fileSize: pdfFile.size
    };

    await scheme.save();

    res.json({
      success: true,
      message: 'Marking scheme PDF uploaded and processed',
      scheme: scheme.toObject(),
      extractedText: extractedText.substring(0, 500) + '...', // Preview
      rubric: scheme.rubricText
    });
  } catch (err) {
    console.error('[Marking Scheme PDF] Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
