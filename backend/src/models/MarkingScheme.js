const mongoose = require('mongoose');

/**
 * Marking Scheme Model
 * 
 * Stores detailed marking criteria for questions
 * Allows teachers to define:
 * - Question-specific rubric
 * - Points distribution
 * - Key concepts and their marks
 * - Evaluation criteria at different levels
 */

const markingSchemeSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Link to question or standalone
  questionText: {
    type: String,
    required: true,
    trim: true
  },

  maxMarks: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 10
  },

  // Overall rubric/description
  description: {
    type: String,
    trim: true,
    default: 'Standard marking scheme'
  },

  // Key concepts with marks
  keyConcepts: [{
    concept: {
      type: String,
      required: true,
      trim: true
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
      default: 1
    },
    description: {
      type: String,
      trim: true
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  }],

  // Marking levels (full marks, partial, low, zero)
  markingLevels: [{
    level: {
      type: String,
      enum: ['full', 'partial_high', 'partial_medium', 'partial_low', 'zero'],
      required: true
    },
    marksRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true }
    },
    description: {
      type: String,
      required: true
    },
    criteria: [String] // List of criteria to check
  }],

  // Common mistakes to avoid
  commonMistakes: [{
    mistake: String,
    marksDeduction: { type: Number, default: 0 },
    explanation: String
  }],

  // Bonus/extra credit options
  bonusMarks: [{
    description: String,
    marks: { type: Number, default: 1 }
  }],

  // PDF-based marking scheme
  pdfMarkingScheme: {
    fileName: String,
    extractedText: String, // Full text extracted from PDF
    uploadedAt: Date,
    fileSize: Number // in bytes
  },

  // Timestamp
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for fast queries
markingSchemeSchema.index({ teacherId: 1, createdAt: -1 });
markingSchemeSchema.index({ teacherId: 1, questionText: 1 });

// Virtual: Generate rubric text for AI
markingSchemeSchema.virtual('rubricText').get(function() {
  // If PDF was uploaded, use the extracted text
  if (this.pdfMarkingScheme && this.pdfMarkingScheme.extractedText) {
    return `Question: ${this.questionText}\nMax Marks: ${this.maxMarks}\n\n` +
           `Marking Scheme from PDF:\n${this.pdfMarkingScheme.extractedText}`;
  }

  let rubric = `Question: ${this.questionText}\nMax Marks: ${this.maxMarks}\n\n`;
  
  rubric += `Marking Scheme:\n`;
  rubric += `${this.description}\n\n`;

  if (this.keyConcepts && this.keyConcepts.length > 0) {
    rubric += `Key Concepts (total ${this.keyConcepts.reduce((sum, c) => sum + c.marks, 0)} marks):\n`;
    this.keyConcepts.forEach((concept, i) => {
      rubric += `${i + 1}. ${concept.concept} (${concept.marks} marks)`;
      if (concept.isRequired) rubric += ' [REQUIRED]';
      if (concept.description) rubric += ` - ${concept.description}`;
      rubric += '\n';
    });
    rubric += '\n';
  }

  if (this.markingLevels && this.markingLevels.length > 0) {
    rubric += `Marking Levels:\n`;
    this.markingLevels.forEach(level => {
      rubric += `- ${level.level.toUpperCase()} (${level.marksRange.min}-${level.marksRange.max} marks): ${level.description}\n`;
      if (level.criteria && level.criteria.length > 0) {
        level.criteria.forEach(criterion => {
          rubric += `  • ${criterion}\n`;
        });
      }
    });
    rubric += '\n';
  }

  if (this.commonMistakes && this.commonMistakes.length > 0) {
    rubric += `Common Mistakes to Avoid:\n`;
    this.commonMistakes.forEach((mistake, i) => {
      rubric += `${i + 1}. ${mistake.mistake}`;
      if (mistake.marksDeduction > 0) rubric += ` (-${mistake.marksDeduction} marks)`;
      if (mistake.explanation) rubric += ` - ${mistake.explanation}`;
      rubric += '\n';
    });
    rubric += '\n';
  }

  if (this.bonusMarks && this.bonusMarks.length > 0) {
    rubric += `Extra Credit:\n`;
    this.bonusMarks.forEach((bonus, i) => {
      rubric += `${i + 1}. ${bonus.description} (+${bonus.marks} marks)\n`;
    });
  }

  return rubric;
});

module.exports = mongoose.model('MarkingScheme', markingSchemeSchema);
