# 🖊️ OCR Integration - Reference Card

## Quick Access

| Item | Location | Purpose |
|------|----------|---------|
| **Component** | `frontend/src/components/OCRUploadHandwritten.js` | Main React component for uploading & evaluating handwritten answers |
| **Styles** | `frontend/src/styles/OCRUpload.css` | Component styling |
| **Route** | `http://localhost:3000/ocr-handwritten` | Frontend page to access OCR feature |
| **Backend Service** | `backend/src/services/ocrService.js` | OCR.Space API integration |
| **Evaluation Service** | `backend/src/services/evaluationService.js` | AI evaluation logic |
| **API Routes** | `backend/src/routes/ocrEvaluationRoutes.js` | Express.js endpoints |
| **Documentation** | `OCR_INTEGRATION_GUIDE.md` | Complete reference |
| **Quick Start** | `OCR_QUICK_START.md` | 5-minute setup guide |

---

## Feature Summary

### 🎯 What Users Can Do
1. Upload handwritten answer sheet (image/PDF)
2. See extracted text automatically
3. Edit extracted text if needed
4. Get instant AI evaluation with:
   - Score (0-100)
   - Matched concepts ✓
   - Missing concepts ✗
   - Detailed feedback

### 🔧 Technical Stack
- **Frontend**: React with Axios
- **Backend**: Express.js with Node.js
- **OCR**: OCR.Space Free API (no key needed)
- **Evaluation**: Groq/HuggingFace APIs
- **File Handling**: Multer for uploads

### 📡 Available Endpoints
```
POST /api/ocr/extract
POST /api/ocr/extract-batch
POST /api/evaluate/handwritten
POST /api/evaluate/text
```

---

## 🚀 Getting Started

### 1. Start Backend
```bash
cd backend && npm start
```
Backend runs on: `http://localhost:5000`

### 2. Start Frontend (new terminal)
```bash
cd frontend && npm start
```
Frontend runs on: `http://localhost:3000`

### 3. Go to OCR Page
- URL: `http://localhost:3000/ocr-handwritten`
- Or click menu item: "Evaluate Handwritten Answers (with OCR)"

### 4. (Optional) Configure API Keys
Edit `backend/.env`:
```
GROQ_API_KEY=your_key         # For evaluation
HUGGING_FACE_API_KEY=your_key # Fallback
# OCR works without key (free tier)
```

---

## 📋 File Formats Supported

| Format | Max Size | Use Case |
|--------|----------|----------|
| JPG | 10MB | Photo of handwritten answer |
| PNG | 10MB | Screenshot of answer |
| GIF | 10MB | Animated image (uses first frame) |
| BMP | 10MB | Bitmap image |
| PDF | 10MB | Scanned document |

---

## ⚡ How It Works (Step-by-Step)

```
1. Teacher uploads handwritten image/PDF
   └─→ File sent to backend via multipart form

2. Backend receives file
   └─→ Saved temporarily to uploads/handwritten/

3. OCR.Space API processes file
   └─→ Extracts text using optical character recognition

4. Extracted text returned to frontend
   └─→ Displayed in preview box for review

5. Teacher optionally edits extracted text
   └─→ Can correct OCR mistakes

6. Teacher enters model answer
   └─→ Provides reference correct answer

7. AI Evaluation starts
   └─→ Uses Groq/HuggingFace to compare answers

8. Results displayed
   └─→ Score, matched concepts, missing concepts, feedback

9. File cleaned up
   └─→ No permanent storage (privacy)
```

---

## 🎓 Example Usage

### Scenario
Teacher wants to evaluate John's handwritten exam response.

### Steps
1. Take photo of John's answer: `john_answer.jpg`
2. Upload to OCR page
3. System shows: "Photosynthesis is the process where plants convert light..."
4. Teacher confirms text looks correct
5. Teacher enters model answer key points:
   - Definition of photosynthesis
   - Light and dark reactions
   - Role of chlorophyll
   - Energy (ATP/NADPH) production
6. Click evaluate
7. Results:
   - **Score**: 72/100
   - **✓ Matched**: [photosynthesis, light, energy]
   - **✗ Missing**: [dark reactions, chlorophyll, ATP]
   - **Feedback**: "Good understanding of basics. Study the dark reactions and role of chlorophyll for 100%."

---

## 🔒 Security & Privacy

| Aspect | Details |
|--------|---------|
| **Data Storage** | Files processed in-memory, not stored |
| **Privacy** | Only extracted text sent to AI, not original file |
| **Rate Limiting** | Recommended for production deployment |
| **OCR.Space** | Free tier ~25 requests/day per IP |
| **API Keys** | Stored in .env, never exposed in code |

---

## ⚙️ API Configuration

### Option 1: Groq (Recommended)
```
Name:     Groq
Website:  https://console.groq.com
Free:     Yes (5k requests/month)
Speed:    Fast (~0.5-2 sec per eval)
Setup:    Get API key and add to .env
```

### Option 2: HuggingFace (Fallback)
```
Name:     HuggingFace
Website:  https://huggingface.co/settings/tokens
Free:     Yes (with limits)
Speed:    Slower (~5-10 sec per eval)
Setup:    Get API key and add to .env
```

### Option 3: OCR.Space (Always Free)
```
Name:     OCR.Space
Website:  https://ocr.space
Free:     Yes (25 req/day, no signup!)
Speed:    ~5-30 seconds per file
Setup:    No configuration needed!
```

---

## 🧪 Testing Endpoints

### Test Extract Text
```bash
curl -F "file=@answer.jpg" \
     http://localhost:5000/api/ocr/extract
```

### Test Evaluation
```bash
curl -X POST http://localhost:5000/api/evaluate/text \
  -H "Content-Type: application/json" \
  -d '{
    "studentAnswer": "DNA stores genetic information",
    "modelAnswer": "DNA is a molecule that stores genetic information through nucleotide sequences",
    "question": "What is DNA?"
  }'
```

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| No text extracted | Low image quality | Take clearer photo with good lighting |
| Evaluation fails | Missing API key | Add GROQ_API_KEY to .env |
| File upload fails | Wrong format/size | Use JPG/PNG/PDF, <10MB |
| Rate limit exceeded | Too many requests | Wait, upgrade to paid OCR tier |
| Typos in extraction | OCR mistakes | Edit text in preview before eval |

---

## 📈 Performance Tips

### For Best OCR Results
- ✓ Good lighting (no shadows)
- ✓ Straight angle (90° to paper)
- ✓ High resolution (200+ DPI)
- ✓ Clear, legible handwriting
- ✓ Black ink on white paper

### For Best Evaluation
- ✓ Clear model answer with key points
- ✓ Include question for context
- ✓ Use same terminology as expected
- ✓ Edit OCR errors before evaluation

---

## 📚 Learn More

| Document | Contains |
|----------|----------|
| `OCR_INTEGRATION_GUIDE.md` | Complete API docs, architecture, troubleshooting |
| `OCR_QUICK_START.md` | 5-minute setup, common Q&A |
| `ocr_summary.sh` | This summary (run with bash) |

---

## ✅ Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can access `/ocr-handwritten` page
- [ ] Can upload image/PDF without errors
- [ ] OCR extracts text successfully
- [ ] AI evaluation returns score
- [ ] Results show matched/missing concepts
- [ ] No console errors

---

## 🎉 You're All Set!

Everything is installed and configured. Just:

1. Start backend: `npm start` (in backend folder)
2. Start frontend: `npm start` (in frontend folder)
3. Visit: `http://localhost:3000/ocr-handwritten`
4. Upload a handwritten answer and watch it work!

**Happy evaluating! 🖊️**
