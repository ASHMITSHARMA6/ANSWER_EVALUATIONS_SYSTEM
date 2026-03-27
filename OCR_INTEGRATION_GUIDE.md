# 🖊️ OCR Integration Guide - Handwritten Answer Evaluation

## Overview

The system now supports **automatic OCR text extraction** from handwritten student answers using **OCR.Space Free API**, followed by **AI evaluation** of the extracted text.

### Features
✅ **Free OCR API** (OCR.Space) - No API key needed for basic usage  
✅ **Handwritten Text Extraction** - Supports images (JPG, PNG, GIF) and PDFs  
✅ **Automatic AI Evaluation** - Extracts text then evaluates against model answer  
✅ **Progress Tracking** - Visual feedback during OCR processing  
✅ **Text Editing** - Users can edit extracted text before evaluation  
✅ **Concept Matching** - Shows matched and missing concepts in evaluation  

---

## 🏗️ Architecture

```
Frontend (React)
├── OCRUploadHandwritten.js
│   ├── Upload handwritten image/PDF
│   ├── Show OCR progress
│   └── Display extracted text for editing
└── Routes: /ocr-handwritten

                    ↓ (File Upload + Extraction Request)

Backend (Express.js)
├── src/routes/ocrEvaluationRoutes.js
│   ├── POST /api/ocr/extract (single file)
│   ├── POST /api/ocr/extract-batch (multiple files)
│   ├── POST /api/evaluate/handwritten (OCR + eval combo)
│   └── POST /api/evaluate/text (text-only eval)
│
├── src/services/ocrService.js
│   ├── extractTextFromImage() → calls OCR.Space API
│   ├── extractTextFromPDF() → calls OCR.Space API
│   └── extractText() → auto-detect file type
│
└── src/services/evaluationService.js
    ├── evaluateAnswer() → AI evaluation
    ├── createEvaluationPrompt() → format prompt
    ├── evaluateWithGroq() → Groq API
    └── evaluateWithHuggingFace() → HF API

                    ↓ (External APIs)

External Services
├── OCR.Space API (Free)
│   └── Extracts text from images/PDFs
├── Groq API (Fast LLM)
│   └── Evaluates extracted text
└── Hugging Face API (Fallback)
    └── Alternative evaluation
```

---

## 🚀 How to Use

### For End Users (Teachers)

1. **Go to OCR Page**
   - In the sidebar, click "Evaluate Handwritten Answers (with OCR)"
   - Or navigate to `/ocr-handwritten`

2. **Upload Handwritten Answer**
   - Select "🖊️ Handwritten (OCR)" tab
   - Click file upload box or drag & drop
   - Supports: JPG, PNG, GIF, or PDF

3. **Extract Text**
   - Click "🔍 Extract Text with OCR"
   - Wait for processing (shows progress %)
   - Review extracted text
   - Edit if needed before evaluation

4. **Enter Model Answer**
   - Fill "Model Answer (Correct Answer)" field
   - Optionally add the question

5. **Evaluate**
   - Click "⚖️ Evaluate Answer"
   - Receive:
     - Score (0-100)
     - Matched concepts ✓
     - Missing concepts ✗
     - Detailed feedback

---

## 📝 API Endpoints

### 1. Extract Text from Single File
```bash
POST /api/ocr/extract

Content-Type: multipart/form-data
Body:
  - file: <image or PDF file>

Response:
{
  "success": true,
  "extractedText": "The extracted text from the file...",
  "fileName": "answer.jpg",
  "fileSize": 125440,
  "message": "Text extracted successfully"
}
```

### 2. Extract Text from Multiple Files
```bash
POST /api/ocr/extract-batch

Content-Type: multipart/form-data
Body:
  - files: <multiple files, max 10>

Response:
{
  "success": true,
  "totalFiles": 3,
  "results": [
    {
      "filePath": "/path/to/file1.jpg",
      "text": "Extracted text...",
      "success": true
    },
    ...
  ]
}
```

### 3. Evaluate Handwritten Answer (OCR + AI)
```bash
POST /api/evaluate/handwritten

Content-Type: multipart/form-data
Body:
  - file: <image or PDF>
  - modelAnswer: "The correct answer..."
  - question: "What is...?" (optional)

Response:
{
  "success": true,
  "extractedText": "Text from OCR...",
  "evaluation": {
    "score": 85,
    "matchedConcepts": ["concept1", "concept2"],
    "missingConcepts": ["concept3"],
    "feedback": "Good understanding of...",
    "success": true
  },
  "fileName": "answer.jpg"
}
```

### 4. Evaluate Text-Only Answer
```bash
POST /api/evaluate/text

Content-Type: application/json
Body:
{
  "studentAnswer": "The student's answer...",
  "modelAnswer": "The correct answer...",
  "question": "What is...?" (optional)
}

Response:
{
  "success": true,
  "evaluation": {
    "score": 75,
    "matchedConcepts": ["concept1"],
    "missingConcepts": ["concept2", "concept3"],
    "feedback": "You understood X but missed Y..."
  }
}
```

---

## ⚙️ Configuration

### Backend Setup

1. **Ensure required packages are installed:**
```bash
cd backend
npm install
```

2. **Configure API keys in `.env`:**
```env
# AI Evaluation (choose one)
GROQ_API_KEY=your_groq_key          # Recommended (fast, free tier)
HUGGING_FACE_API_KEY=your_hf_key   # Fallback

# OCR.Space (no key needed for free tier)
# Free tier: ~25 requests/day per IP
```

3. **Create uploads directory (auto-created by app):**
```bash
mkdir -p backend/uploads/handwritten
```

### Frontend Setup

1. **The OCR component is already added:**
   - File: `frontend/src/components/OCRUploadHandwritten.js`
   - Style: `frontend/src/styles/OCRUpload.css`
   - Route: `/ocr-handwritten`

2. **Import CSS if not auto-imported:**
```javascript
import '../styles/OCRUpload.css';
```

---

## 📊 Example Usage Flow

### Scenario: Teacher evaluating handwritten exam
```
1. Student writes answer on paper
2. Teacher takes a photo or scans the paper
3. Uploads image to the system
4. System extracts text via OCR.Space API
5. Teacher reviews extracted text (can edit if needed)
6. System evaluates against model answer using AI
7. Teacher gets:
   - Automatic score
   - Concept feedback
   - Student can see what they got right/wrong
```

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────┐
│ Upload Handwritten Answer (Image/PDF)          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  OCR.Space    │
         │  Free API     │  ← Extracts text
         └────────┬──────┘
                  │
                  ▼
        ┌──────────────────────┐
        │ Display Extracted     │
        │ Text for Review       │  ← Teacher can edit
        └─────────┬────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Compare with     │
         │ Model Answer     │
         └────────┬─────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │ Groq/HuggingFace     │
        │ AI Evaluation        │  ← Score + Feedback
        └────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────┐
        │ Evaluation Results   │
        │ • Score              │
        │ • Matched Concepts   │
        │ • Missing Concepts   │
        │ • Feedback           │
        └──────────────────────┘
```

---

## 🔑 API Keys & Free Tiers

### OCR.Space API
- **Free Tier**: ~25 requests/day per IP (no key needed)
- **Paid**: Unlimited requests (~$5-20/month)
- **API Key** (optional): `K87899142C88` (public free key)
- **Supports**: JPG, PNG, GIF, BMP, PDF
- **Accuracy**: Good for printed, decent for handwritten

### Groq API (Recommended for Evaluation)
- **Free Tier**: 5,000 requests/month
- **Model**: `mixtral-8x7b-32768` (powerful, fast)
- **Get Key**: https://console.groq.com
- **Speed**: ~0.5-2 seconds per evaluation

### Hugging Face API (Fallback)
- **Free Tier**: Limited (rate-limited)
- **Model**: Llama-2-7b-chat
- **Get Key**: https://huggingface.co/settings/tokens
- **Speed**: ~5-10 seconds per evaluation

---

## 🐛 Troubleshooting

### Issue: "Could not extract any text from file"
**Causes:**
- Image is too blurry/low quality
- Handwriting is illegible
- PDF is scanned image without text layer

**Solutions:**
1. Take a clearer photo (good lighting, straight angle)
2. Scan at higher resolution (300 DPI minimum)
3. Try with a better handwritten sample
4. For typed answers, use the "⌨️ Typed Answer" mode

### Issue: "OCR Processing Error"
**Causes:**
- File too large (>10MB)
- Unsupported file format
- OCR.Space API rate limit hit

**Solutions:**
1. Compress image before uploading
2. Use supported formats: JPG, PNG, GIF, PDF
3. Wait a few minutes before retrying (rate limit resets)
4. Get paid OCR.Space API key for unlimited requests

### Issue: Evaluation not working
**Causes:**
- No API key configured
- Model answer is empty
- Network error

**Solutions:**
1. Check `.env` has `GROQ_API_KEY` or `HUGGING_FACE_API_KEY`
2. Enter model answer before evaluating
3. Check internet connection
4. Look at backend logs: `npm run dev` to see errors

### Issue: Extracted text has errors
**Solution:**
- Edit the text in the extracted text box before evaluation
- System allows corrections before submitting for AI evaluation

---

## 📈 Evaluation Quality Tips

### For Best OCR Results:
1. **Image Quality**
   - Good lighting (no shadows)
   - Straight angle (90° to page)
   - High resolution (prefer 200+ DPI)
   - Clear handwriting

2. **File Format**
   - Prefer JPG for photos
   - Prefer PDF for scans
   - Black ink on white paper works best

### For Best AI Evaluation:
1. **Model Answer**
   - Clear, detailed key points
   - Include example concepts
   - Use same terminology as expected

2. **Question Context**
   - Include the question for better context
   - Helps AI understand what's being asked
   - Improves accuracy of concept matching

---

## 🔐 Security & Privacy

- **No cloud storage**: Files processed in-memory, not saved permanently
- **Rate limiting**: Recommended to add rate limits for production
- **Data**: Only extracted text is sent to AI, not original file

---

## 📚 File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── ocrEvaluationRoutes.js      ← Main OCR routes
│   └── services/
│       ├── ocrService.js              ← OCR.Space integration
│       └── evaluationService.js        ← AI evaluation logic
└── uploads/
    └── handwritten/                     ← Temporary upload storage

frontend/
├── src/
│   ├── components/
│   │   └── OCRUploadHandwritten.js    ← Main component
│   └── styles/
│       └── OCRUpload.css              ← Component styles
└── src/App.js                          ← Route added
```

---

## 🚀 Next Steps

1. **Test the system:**
   ```bash
   cd backend && npm start
   cd frontend && npm start
   # Go to http://localhost:3000/ocr-handwritten
   ```

2. **Configure API keys** in `backend/.env`

3. **Test with sample images:**
   - Handwritten text image
   - PDF scan
   - Typed text (fallback)

4. **Monitor logs** for any errors

---

## 📞 Support

For issues or questions:
1. Check the "Troubleshooting" section above
2. Review logs: `npm run dev` (backend)
3. Check API key configuration in `.env`
4. Verify file format and size

---

**Happy evaluating! 🎓**
