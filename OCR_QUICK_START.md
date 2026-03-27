# ⚡ OCR Integration - Quick Start (5 Minutes)

## What's New?
You can now upload **handwritten answer sheets** and the system will:
1. 📸 Extract text automatically using OCR.Space (free!)
2. 🤖 Evaluate against model answer using AI
3. 📊 Show score + matched/missing concepts

---

## 🎯 For Users - How to Use

### Step 1: Go to OCR Page
- Click "🖊️ Evaluate Handwritten Answers (with OCR)" in sidebar
- Or visit: `http://localhost:3000/ocr-handwritten`

### Step 2: Upload Answer Image
1. Click file upload box
2. Select a photo/scan of handwritten answer (JPG, PNG, PDF)
3. Click "🔍 Extract Text with OCR"
4. Wait for text extraction (shows progress %)

### Step 3: Review & Edit (Optional)
- See extracted text in the box
- Edit if OCR made mistakes
- Copy text to clipboard if needed

### Step 4: Add Model Answer
- Enter the correct/model answer
- Optionally add the question for context

### Step 5: Evaluate!
- Click "⚖️ Evaluate Answer"
- Get instant feedback:
  - Score (0-100)
  - ✓ What student got right
  - ✗ What student missed
  - Detailed feedback

---

## ⚙️ For Developers - Setup (2 Minutes)

### Backend
Already set up! Just verify:
```bash
cd backend

# New files created:
# ✓ src/services/ocrService.js
# ✓ src/services/evaluationService.js
# ✓ src/routes/ocrEvaluationRoutes.js
# ✓ server.js (updated with routes)

# Start backend
npm start
```

### Frontend
Already set up! Just verify:
```bash
cd frontend

# New files created:
# ✓ src/components/OCRUploadHandwritten.js
# ✓ src/styles/OCRUpload.css
# ✓ src/App.js (route added)

# Start frontend
npm start

# Visit: http://localhost:3000/ocr-handwritten
```

---

## 🔑 API Configuration

### Option 1: Using Groq (Recommended - Fast & Free)
```bash
# Edit backend/.env
GROQ_API_KEY=gsk_your_key_here

# Get key: https://console.groq.com
```

### Option 2: Using Hugging Face (Fallback)
```bash
# Edit backend/.env
HUGGING_FACE_API_KEY=hf_your_key_here

# Get key: https://huggingface.co/settings/tokens
```

### OCR.Space (Free - No Key Needed!)
- Free tier built-in: ~25 requests/day
- Public API key pre-configured
- No setup required!

---

## 📋 What Was Added

### Backend Files
```
src/services/ocrService.js           ← OCR.Space API calls
src/services/evaluationService.js    ← AI evaluation logic
src/routes/ocrEvaluationRoutes.js    ← API endpoints
```

### Frontend Files
```
src/components/OCRUploadHandwritten.js  ← Main component
src/styles/OCRUpload.css                ← Styling
```

### API Routes
```
POST /api/ocr/extract                   ← Extract from single file
POST /api/ocr/extract-batch             ← Extract from multiple files
POST /api/evaluate/handwritten          ← OCR + evaluate (combo)
POST /api/evaluate/text                 ← Evaluate text only
```

---

## 🧪 Quick Test

### Test with Sample Image
```bash
# From backend directory
curl -F "file=@/path/to/handwritten_answer.jpg" \
     http://localhost:5000/api/ocr/extract
```

### Test Evaluation
```bash
curl -X POST http://localhost:5000/api/evaluate/text \
  -H "Content-Type: application/json" \
  -d '{
    "studentAnswer": "DNA is made of nucleotides",
    "modelAnswer": "DNA is made of four nucleotides: A, T, G, C",
    "question": "What is DNA made of?"
  }'
```

---

## 🚀 Deployment Checklist

- [ ] API keys configured in `backend/.env`
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can upload images without errors
- [ ] OCR extracts text successfully
- [ ] AI evaluation works and returns score
- [ ] No console errors
- [ ] Test with handwritten sample

---

## 📝 Example Workflow

**Teacher's Perspective:**
```
1. Student submits handwritten exam paper
2. Teacher takes photo: "exam_john.jpg"
3. Opens OCR page and uploads image
4. System extracts: "Photosynthesis is a process where..."
5. Teacher reviews - looks good ✓
6. Enters model answer with key concepts
7. Clicks "Evaluate"
8. Gets score: 75/100
   - Matched concepts: [photosynthesis, light, glucose, water]
   - Missing concepts: [ATP, chlorophyll, electron transport]
9. Feedback explains what John understood vs missed
10. John can see feedback and improve
```

---

## ❓ Common Questions

**Q: Do I need to pay for OCR?**
A: No! Free tier included. 25 requests/day per IP.

**Q: Does it work with bad handwriting?**
A: Works best with clear, legible writing. Quality depends on:
- Image clarity (good lighting)
- Handwriting legibility
- Paper contrast

**Q: Can teachers edit extracted text?**
A: Yes! Extracted text is in an editable text box before evaluation.

**Q: What file formats work?**
A: JPG, PNG, GIF, BMP, PDF (scans with images)

**Q: Is student data stored?**
A: No permanent storage. Only extracted text is used for evaluation.

---

## 🐛 Troubleshooting

**No text extracted:**
- Check image quality (good lighting, straight angle)
- Try higher resolution image
- Ensure handwriting is clear

**Evaluation fails:**
- Check API key in `.env`
- Verify model answer is filled
- Check internet connection

**File upload fails:**
- File must be <10MB
- Must be valid image or PDF format

**Rate limit hit:**
- OCR.Space free tier: 25 requests/day
- Wait a few minutes or get paid API key

---

## 📚 Full Documentation

See `OCR_INTEGRATION_GUIDE.md` for complete details including:
- Detailed API documentation
- Architecture explanation
- Advanced configuration
- Security considerations

---

**Ready to evaluate handwritten answers? Go to `/ocr-handwritten` now! 🎓**
