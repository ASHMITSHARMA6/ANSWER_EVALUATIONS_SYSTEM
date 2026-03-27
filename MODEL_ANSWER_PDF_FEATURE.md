# 📄 Model Answer PDF Extraction Feature

## Overview

Teachers can now upload PDFs containing model answers, which will be automatically extracted and used for student evaluation. This feature streamlines the process of setting up answer keys.

## ✨ Features

### Two Input Modes:

1. **✍️ Type/Paste Text** - Manual text input for model answers
2. **📄 Extract from PDF** ⭐ **NEW** - Automatic PDF text extraction

## 🚀 How to Use

### Step-by-Step Guide:

1. **Go to Model Answer Tab**
   - Click "Model Answer" in the navigation menu
   - Two input mode buttons appear

2. **Select "Extract from PDF" Mode**
   - Click the "📄 Extract from PDF" button
   - Interface switches to PDF extraction mode

3. **Upload PDF File**
   - Click "Choose Files" button
   - Select a PDF containing the model answer
   - File selection shows: "✅ filename.pdf"

4. **Extract Text**
   - Click "🔍 Extract Text" button
   - System extracts all text from the PDF
   - Extracted text auto-fills the model answer field

5. **Review & Edit (Optional)**
   - Review extracted text in the textarea
   - Edit if needed to remove unwanted content
   - Character count shows at the bottom

6. **Add Question & Marks**
   - Enter question text (optional)
   - Set maximum marks (1-100)

7. **Upload Model Answer**
   - Click "📤 Upload Model Answer"
   - Confirmation message shows success
   - Ready for evaluating student answers

## 📋 Technical Details

### Frontend Component: `UploadModelAnswer.js`

**New State Variables:**
```javascript
const [mode, setMode] = useState('text'); // 'text' | 'pdf'
const [pdfFile, setPdfFile] = useState(null);
const [loading, setLoading] = useState(false);
const fileInputRef = useRef(null);
```

**Key Functions:**

```javascript
// Handle mode switching
const handleModeChange = (newMode) => {
  setMode(newMode);
  // Reset state appropriately
}

// File selection
const onFileChange = (e) => {
  const f = e.target.files?.[0];
  if (f && f.type === 'application/pdf') {
    setPdfFile(f);
  }
}

// Extract text from PDF
const extractTextFromPDF = async () => {
  const fd = new FormData();
  fd.append('file', pdfFile);
  const response = await axiosInstance.post('/api/extract-pdf', fd);
  setModelAnswer(response.data.text); // Auto-fill textarea
}
```

### Backend Route: `extractPdf.js`

**Endpoint:** `POST /api/extract-pdf`

**Request:**
- Content-Type: multipart/form-data
- File: PDF file

**Response:**
```json
{
  "text": "Extracted text from PDF..."
}
```

**Error Handling:**
- No PDF file: 400 error
- Not a PDF: 400 error
- Scanned image PDF: 400 error with message
- Extraction failure: 400 error

**Process:**
1. Receive PDF file via multer
2. Parse PDF using `pdf-parse` library
3. Extract text content
4. Validate text exists
5. Return extracted text to frontend

### Integration in Main Server:

```javascript
// backend/src/index.js
const extractPdfRoutes = require('./routes/extractPdf');
app.use('/api/extract-pdf', extractPdfRoutes);
```

## ✅ Error Handling

| Scenario | Error Message | Solution |
|----------|---------------|----------|
| No file selected | "Please select a PDF file first." | Click "Choose Files" |
| Wrong file type | "Please select a PDF file." | Select only .pdf files |
| Scanned image PDF | "No text found in PDF. Ensure it is a text-based PDF..." | Use PDF with text, not images |
| Corrupted PDF | "Could not extract text from PDF..." | Verify PDF is not corrupted |
| Network error | "Failed to extract text from PDF..." | Check internet connection |

## 📊 Features & Limits

| Feature | Details |
|---------|---------|
| **Max File Size** | 10MB |
| **Supported Format** | PDF only |
| **PDF Type Required** | Text-based (not scanned images) |
| **Extraction Speed** | 2-5 seconds typical |
| **Character Limit** | No hard limit in textarea |
| **Mark Range** | 1-100 |

## 🔧 Configuration

### Increase PDF File Size Limit:

Edit `/backend/src/routes/extractPdf.js`, line 12:
```javascript
limits: { fileSize: 20 * 1024 * 1024 }, // Change from 10MB to 20MB
```

### Require Question Text:

Edit `/frontend/src/components/UploadModelAnswer.js`, line ~125:
```javascript
<input
  ...
  required  // Add this attribute
/>
```

## 🧪 Testing Checklist

- [x] PDF file selection works
- [x] Text extraction from PDF successful
- [x] Extracted text auto-fills textarea
- [x] Character count displays
- [x] Manual text input still works
- [x] Validation for empty answer
- [x] Success/error messages display
- [x] Max marks validation (1-100)
- [x] Backend endpoint created and registered
- [x] No syntax errors, builds successfully

## 📝 Usage Example

**Scenario:** Teacher has a PDF with model answer "The process of photosynthesis converts light energy into chemical energy through chlorophyll..."

**Steps:**
1. Click "📄 Extract from PDF"
2. Select the PDF file with model answer
3. Click "🔍 Extract Text"
4. Text auto-fills in the textarea
5. Review and edit if needed
6. Add question: "Explain photosynthesis"
7. Set marks: 10
8. Click "📤 Upload Model Answer"
9. ✅ Model answer is now ready for evaluations

## 🎯 Integration with Evaluation

Once a model answer is uploaded (via text or PDF extraction):

1. **Single Answer Evaluation**
   - Go to "Evaluate" tab
   - Student answer is compared against this model answer
   - Groq AI generates score + feedback

2. **Batch Evaluation**
   - Go to "Student Answer" tab
   - Upload batch of student answers
   - All evaluated against this model answer

## 💡 Best Practices

1. **PDF Quality**
   - Use text-based PDFs (not scanned images)
   - Ensure good OCR quality if converting from scanned
   - Test with small PDF first

2. **Answer Preparation**
   - Keep model answers concise and clear
   - Include key concepts and examples
   - Remove extraneous content before uploading

3. **Batch Uploads**
   - Update model answer before batch evaluation
   - Use latest model answer for all evaluations
   - Keep consistent grading criteria

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| "No text found in PDF" | PDF is scanned image, not text-based |
| Text extraction is slow | Large PDF file, may take 5-10 seconds |
| Special characters garbled | PDF encoding issue, try re-saving PDF |
| Extraction button disappears | Model answer already filled, click tab to reset |

## 📦 Files Modified/Created

### Created:
- `/backend/src/routes/extractPdf.js` - PDF extraction endpoint

### Modified:
- `/backend/src/index.js` - Registered new route
- `/frontend/src/components/UploadModelAnswer.js` - Enhanced with PDF mode

## 🔗 API Reference

### Extract PDF Text

**Endpoint:** `POST /api/extract-pdf`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**
```
file: <PDF file>
```

**Success Response (200):**
```json
{
  "text": "Full text extracted from PDF document..."
}
```

**Error Response (400):**
```json
{
  "error": "Error message describing the issue"
}
```

## 🎓 Teacher Workflow

```
1. Upload Study Material (PDF/text)
   ↓
2. Generate Questions (AI powered)
   ↓
3. Upload Model Answer (PDF/text) ← NEW FEATURE
   ↓
4. Upload Student Answers (PDF/batch)
   ↓
5. Automatic AI Evaluation
   ↓
6. View Results & Feedback
```

---

**Last Updated:** February 7, 2026
**Feature Status:** ✅ COMPLETE & TESTED
**Dependencies:** pdf-parse (already installed)
