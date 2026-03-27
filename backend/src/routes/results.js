const express = require('express');
const EvaluationResult = require('../models/EvaluationResult');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const router = express.Router();

// GET /api/results — all evaluation results for the logged-in teacher
// Supports grouping by batch
router.get('/', auth, async (req, res) => {
  try {
    const { groupByBatch, testId } = req.query;
    const filter = { teacherId: req.user._id };
    if (testId) filter.testId = testId;
    const results = await EvaluationResult.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (groupByBatch === 'true') {
      // Group results by batchId or submission date
      const grouped = {};
      const ungrouped = [];

      results.forEach(result => {
        if (result.batchId) {
          if (!grouped[result.batchId]) {
            grouped[result.batchId] = {
              batchId: result.batchId,
              totalStudents: 0,
              averageScore: 0,
              highestScore: 0,
              lowestScore: 100,
              results: [],
              createdAt: result.createdAt
            };
          }
          grouped[result.batchId].results.push(result);
        } else {
          ungrouped.push(result);
        }
      });

      // Calculate batch statistics
      Object.keys(grouped).forEach(batchId => {
        const batch = grouped[batchId];
        batch.totalStudents = batch.results.length;
        batch.averageScore = batch.results.reduce((sum, r) => sum + (r.marks || 0), 0) / batch.totalStudents;
        batch.highestScore = Math.max(...batch.results.map(r => r.marks || 0));
        batch.lowestScore = Math.min(...batch.results.map(r => r.marks || 0));
      });

      res.json({
        results: Object.values(grouped),
        ungrouped,
        total: results.length
      });
    } else {
      res.json({ results });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch results' });
  }
});

// GET /api/results/batch/:batchId — Get all results in a batch
router.get('/batch/:batchId', auth, async (req, res) => {
  try {
    const { testId } = req.query;
    const filter = {
      teacherId: req.user._id,
      batchId: req.params.batchId
    };
    if (testId) filter.testId = testId;
    const results = await EvaluationResult.find({
      ...filter
    }).sort({ createdAt: -1 });

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch batch results' });
  }
});

// DELETE /api/results/:id — Delete a single result
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await EvaluationResult.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user._id
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json({
      success: true,
      message: `Result for ${result.studentName} deleted successfully`
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete result' });
  }
});

// GET /api/results/download/pdf/:id — Download result as PDF
router.get('/download/pdf/:id', auth, async (req, res) => {
  try {
    const { testId } = req.query;
    const filter = { _id: req.params.id, teacherId: req.user._id };
    if (testId) filter.testId = testId;
    const result = await EvaluationResult.findOne(filter);

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Create PDF
    const doc = new PDFDocument();
    const filename = `result_${result.studentName}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // PDF Content
    doc.fontSize(20).font('Helvetica-Bold').text('Evaluation Result', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Student Name: ${result.studentName}`);
    doc.text(`Question: ${result.questionText || 'N/A'}`);
    doc.text(`Marks: ${result.marks} / ${result.maxMarks}`);
    doc.text(`Percentage: ${((result.marks / result.maxMarks) * 100).toFixed(2)}%`);
    doc.text(`Date: ${new Date(result.createdAt).toLocaleString()}`);
    doc.moveDown();

    if (result.feedback) {
      doc.fontSize(14).font('Helvetica-Bold').text('Feedback:');
      doc.fontSize(11).font('Helvetica').text(result.feedback);
      doc.moveDown();
    }

    if (result.matchedConcepts && result.matchedConcepts.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Matched Concepts:');
      result.matchedConcepts.forEach(concept => {
        doc.fontSize(11).text(`• ${concept}`);
      });
      doc.moveDown();
    }

    if (result.missingConcepts && result.missingConcepts.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Missing Concepts:');
      result.missingConcepts.forEach(concept => {
        doc.fontSize(11).text(`• ${concept}`);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

module.exports = router;
