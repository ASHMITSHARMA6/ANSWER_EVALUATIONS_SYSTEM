# 🏗️ OCR Integration - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TEACHER/USER BROWSER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        OCRUploadHandwritten React Component                 │   │
│  │  (frontend/src/components/OCRUploadHandwritten.js)          │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Upload File Input                                 │  │   │
│  │  │    - Accept JPG, PNG, GIF, PDF                       │  │   │
│  │  │    - Max 10MB                                        │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                         ↓                                   │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ 2. OCR Extraction Request                             │  │   │
│  │  │    - POST /api/ocr/extract                           │  │   │
│  │  │    - Send file to backend                            │  │   │
│  │  │    - Show progress bar (0-100%)                      │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                         ↓                                   │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ 3. Display Extracted Text                            │  │   │
│  │  │    - Show text in editable box                       │  │   │
│  │  │    - Allow user to correct OCR errors              │  │   │
│  │  │    - Copy to clipboard button                        │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                         ↓                                   │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ 4. Evaluation Form                                   │  │   │
│  │  │    - Model Answer (correct answer)                  │  │   │
│  │  │    - Question (optional context)                    │  │   │
│  │  │    - Evaluation Button                              │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                         ↓                                   │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ 5. Display Results                                   │  │   │
│  │  │    - Score: 75/100                                  │  │   │
│  │  │    - ✓ Matched Concepts: [list]                     │  │   │
│  │  │    - ✗ Missing Concepts: [list]                     │  │   │
│  │  │    - 💬 Detailed Feedback                           │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  ↑ HTTP Requests ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS BACKEND                            │
│                   (backend/server.js, port 5000)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │             API Routes & Request Handling                   │   │
│  │  (backend/src/routes/ocrEvaluationRoutes.js)               │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ POST /api/ocr/extract                               │  │   │
│  │  │ - Receive uploaded file                             │  │   │
│  │  │ - Call ocrService.extractText()                     │  │   │
│  │  │ - Return extracted text                             │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ POST /api/evaluate/text                              │  │   │
│  │  │ - Receive student & model answers                   │  │   │
│  │  │ - Call evaluationService.evaluateAnswer()           │  │   │
│  │  │ - Return score + feedback                           │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ POST /api/evaluate/handwritten                       │  │   │
│  │  │ - Receive file + model answer                       │  │   │
│  │  │ - Extract text + Evaluate (combo)                   │  │   │
│  │  │ - Return both extracted text + evaluation           │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              OCR Service                                    │   │
│  │  (backend/src/services/ocrService.js)                      │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ extractText(filePath)                                │  │   │
│  │  │ - Detect file type (image vs PDF)                   │  │   │
│  │  │ - Read file and encode to base64                    │  │   │
│  │  │ - Call OCR.Space API                                │  │   │
│  │  │ - Return extracted text                             │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  Functions:                                                │   │
│  │  - extractTextFromImage(path)                             │   │
│  │  - extractTextFromPDF(path)                               │   │
│  │  - extractTextFromMultipleFiles([paths])                 │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                ↑ HTTP ↓                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         Evaluation Service                                  │   │
│  │  (backend/src/services/evaluationService.js)               │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ evaluateAnswer(student, model, question)             │  │   │
│  │  │ - Create evaluation prompt                           │  │   │
│  │  │ - Call AI API (Groq or HF)                          │  │   │
│  │  │ - Parse response                                     │  │   │
│  │  │ - Return score + concepts + feedback                │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  Logic:                                                    │   │
│  │  1. createEvaluationPrompt() → format comparison prompt   │   │
│  │  2. evaluateWithGroq() → Call Groq API                    │   │
│  │  3. evaluateWithHuggingFace() → Fallback HF API           │   │
│  │  4. parseEvaluationResponse() → Extract score & concepts  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  ↑ HTTP ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIs                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              OCR.Space API                                  │   │
│  │              (FREE - No Key Needed!)                        │   │
│  │                                                              │   │
│  │  Endpoint: https://api.ocr.space/parse                     │   │
│  │  Input:    base64 image/PDF                               │   │
│  │  Output:   Extracted text (ParsedText field)              │   │
│  │  Free:     ~25 requests/day per IP                        │   │
│  │  Paid:     Unlimited (~$5-20/month)                       │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Groq API (RECOMMENDED)                         │   │
│  │              (Fast LLM Evaluation)                          │   │
│  │                                                              │   │
│  │  Endpoint: https://api.groq.com/openai/v1/chat/completions│   │
│  │  Model:    mixtral-8x7b-32768                             │   │
│  │  Input:    Comparison prompt with student & model answer  │   │
│  │  Output:   JSON with score + concepts + feedback          │   │
│  │  Free:     5000 requests/month                            │   │
│  │  Speed:    ~0.5-2 seconds per evaluation                  │   │
│  │  Setup:    Get key from https://console.groq.com         │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              HuggingFace API (FALLBACK)                     │   │
│  │              (Fallback LLM Evaluation)                      │   │
│  │                                                              │   │
│  │  Endpoint: api-inference.huggingface.co                    │   │
│  │  Model:    meta-llama/Llama-2-7b-chat-hf                 │   │
│  │  Input:    Comparison prompt                              │   │
│  │  Output:   Generated evaluation text                       │   │
│  │  Free:     Limited (rate-limited)                         │   │
│  │  Speed:    ~5-10 seconds per evaluation                   │   │
│  │  Setup:    Get token from HF settings                     │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Scenario: Teacher uploads handwritten answer for evaluation

```
┌──────────────────────┐
│ Teacher uploads      │
│ handwritten image    │
│ (answer.jpg)         │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│ Frontend Component   │
│ Prepares FormData    │
│ with file            │
└──────────┬───────────┘
           │ POST /api/ocr/extract
           │ (multipart/form-data)
           ↓
┌──────────────────────────────┐
│ Backend Route Handler        │
│ Receives file upload         │
│ Saves to /uploads/handwritten│
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ OCR Service                  │
│ - Read file                  │
│ - Encode to base64           │
│ - Send to OCR.Space API      │
└──────────┬───────────────────┘
           │ HTTP POST
           ↓
      ┌────────────────────────┐
      │ OCR.Space API          │
      │ (External)             │
      │ Processes image        │
      │ Extracts text          │
      └────────┬───────────────┘
               │ JSON Response
               │ {ParsedText: "..."}
               ↓
┌──────────────────────────────┐
│ Backend Returns Extracted    │
│ Text to Frontend             │
│ {extractedText: "..."}       │
└──────────┬───────────────────┘
           │ JSON Response
           ↓
┌──────────────────────┐
│ Frontend Displays    │
│ Extracted Text      │
│ in preview box      │
└──────────┬──────────┘
           │
           ↓ (Teacher reviews & optionally edits)
           │
┌──────────────────────────────┐
│ Teacher Clicks Evaluate      │
│ Sends:                       │
│ - studentAnswer (extracted)  │
│ - modelAnswer (form input)   │
│ - question (optional)        │
└──────────┬───────────────────┘
           │ POST /api/evaluate/text
           │ (JSON)
           ↓
┌──────────────────────────────┐
│ Backend Evaluation Route     │
│ Receives student + model ans │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ Evaluation Service           │
│ - Create prompt:             │
│   "Compare student vs model" │
│ - Call Groq/HF API           │
│ - Parse response for score   │
│   + concepts + feedback      │
└──────────┬───────────────────┘
           │ HTTP POST
           ↓
      ┌────────────────────────┐
      │ Groq/HuggingFace API   │
      │ (External)             │
      │ Evaluates answers      │
      │ Returns JSON with      │
      │ score + concepts       │
      └────────┬───────────────┘
               │ JSON Response
               ↓
┌──────────────────────────────┐
│ Backend Parses & Returns     │
│ Evaluation Results           │
│ {score: 75, matched: [...],  │
│  missing: [...], feedback}   │
└──────────┬───────────────────┘
           │ JSON Response
           ↓
┌──────────────────────────────┐
│ Frontend Displays Results    │
│                              │
│ 📊 Score: 75/100            │
│ ✓ Matched: [concept1, ...]  │
│ ✗ Missing: [concept2, ...]  │
│ 💬 Feedback: "Good work..." │
│                              │
└──────────────────────────────┘
```

---

## Component Structure

```
src/
├── components/
│   └── OCRUploadHandwritten.js
│       ├── State Management
│       │   ├── mode (handwritten | typed)
│       │   ├── file
│       │   ├── extractedText
│       │   ├── studentText
│       │   ├── modelAnswer
│       │   ├── evaluation
│       │   └── loading states
│       │
│       ├── Event Handlers
│       │   ├── handleFileChange()
│       │   ├── handleExtractOCR()
│       │   └── handleEvaluate()
│       │
│       └── UI Sections
│           ├── Mode tabs (Handwritten | Typed)
│           ├── File upload box
│           ├── OCR extraction button
│           ├── Extracted text display (editable)
│           ├── Model answer form
│           ├── Evaluate button
│           └── Results display
│
├── styles/
│   └── OCRUpload.css
│       ├── Container styling
│       ├── Mode tabs styling
│       ├── Form groups
│       ├── File upload box
│       ├── Progress bar
│       ├── Extracted text box
│       ├── Buttons
│       ├── Messages
│       └── Evaluation results display
│
└── api/
    └── axiosInstance.js (existing)
        └── Used for API calls
```

---

## Service Architecture

```
Backend Services

┌─────────────────────────────────────────┐
│         OCR Service                     │
│  (ocrService.js)                        │
├─────────────────────────────────────────┤
│                                         │
│ exports:                                │
│ - extractTextFromImage(path)           │
│ - extractTextFromPDF(path)             │
│ - extractText(path)                    │
│ - extractTextFromMultipleFiles([])     │
│                                         │
│ Internal flow:                          │
│ 1. Check file exists                   │
│ 2. Read file as binary                 │
│ 3. Encode to base64                    │
│ 4. Call OCR.Space API                  │
│ 5. Parse response                      │
│ 6. Return extracted text               │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Evaluation Service                 │
│  (evaluationService.js)                 │
├─────────────────────────────────────────┤
│                                         │
│ exports:                                │
│ - evaluateAnswer(student, model, q)    │
│                                         │
│ Internal flow:                          │
│ 1. Validate inputs                      │
│ 2. Create evaluation prompt             │
│ 3. Choose API (Groq or HF)             │
│ 4. Call selected API                    │
│ 5. Parse JSON response                  │
│ 6. Return {score, concepts, feedback}  │
│                                         │
│ Used by:                                │
│ - POST /api/evaluate/text               │
│ - POST /api/evaluate/handwritten       │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│       Route Handler                     │
│  (ocrEvaluationRoutes.js)               │
├─────────────────────────────────────────┤
│                                         │
│ Routes:                                 │
│                                         │
│ POST /extract                           │
│ ├─ Uses: ocrService                    │
│ └─ Returns: {extractedText, ...}       │
│                                         │
│ POST /extract-batch                     │
│ ├─ Uses: ocrService                    │
│ └─ Returns: {results: [...]}           │
│                                         │
│ POST /handwritten                       │
│ ├─ Uses: ocrService + evaluationService│
│ └─ Returns: {extractedText, evaluation}│
│                                         │
│ POST /text                              │
│ ├─ Uses: evaluationService              │
│ └─ Returns: {evaluation}                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Request/Response Examples

### Request: Extract Text from Image
```
POST /api/ocr/extract
Content-Type: multipart/form-data

file: <binary image data>
```

### Response: Extracted Text
```json
{
  "success": true,
  "extractedText": "Photosynthesis is the process where plants convert light energy...",
  "fileName": "answer.jpg",
  "fileSize": 125440,
  "message": "Text extracted successfully"
}
```

---

### Request: Evaluate Answer
```
POST /api/evaluate/text
Content-Type: application/json

{
  "studentAnswer": "DNA stores genetic information in cells",
  "modelAnswer": "DNA is a molecule that stores genetic information as sequences of nucleotides (A, T, G, C)",
  "question": "What is DNA and its function?"
}
```

### Response: Evaluation Result
```json
{
  "success": true,
  "evaluation": {
    "score": 68,
    "matchedConcepts": [
      "DNA",
      "stores information",
      "genetic"
    ],
    "missingConcepts": [
      "nucleotides",
      "sequencing",
      "ATGC base pairs"
    ],
    "feedback": "You correctly identified that DNA stores genetic information, but you missed details about the molecular structure and nucleotide composition. Study the four nucleotides (Adenine, Thymine, Guanine, Cytosine) for a complete understanding.",
    "success": true
  }
}
```

---

## Technology Stack Details

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18+ | UI component framework |
| | Axios | 1.13+ | HTTP client |
| | CSS3 | Latest | Responsive styling |
| **Backend** | Express.js | 4.18+ | API server |
| | Node.js | 18+ | JavaScript runtime |
| | Multer | 1.4+ | File upload handling |
| **External APIs** | OCR.Space | - | Text extraction |
| | Groq | - | LLM evaluation |
| | HuggingFace | - | Fallback LLM |

---

## File Locations & Purposes

```
/backend
├── server.js ...................... Main Express server (updated)
│                                   - Imports ocrEvaluationRoutes
│                                   - Registers /api/ocr and /api/evaluate
│
├── src/
│   ├── services/
│   │   ├── ocrService.js .......... OCR.Space API integration
│   │   │                          - extractText()
│   │   │                          - extractTextFromImage()
│   │   │                          - extractTextFromPDF()
│   │   │                          - extractTextFromMultipleFiles()
│   │   │
│   │   └── evaluationService.js ... AI Evaluation logic
│   │                              - evaluateAnswer()
│   │                              - createEvaluationPrompt()
│   │                              - evaluateWithGroq()
│   │                              - evaluateWithHuggingFace()
│   │                              - parseEvaluationResponse()
│   │
│   └── routes/
│       └── ocrEvaluationRoutes.js . Express routes (NEW)
│                                   - POST /extract
│                                   - POST /extract-batch
│                                   - POST /handwritten
│                                   - POST /text
│
└── uploads/
    └── handwritten/ ............... Temporary file storage

/frontend
├── src/
│   ├── components/
│   │   └── OCRUploadHandwritten.js  Main component (NEW)
│   │                                - Upload handler
│   │                                - OCR extraction UI
│   │                                - Evaluation form
│   │                                - Results display
│   │
│   ├── styles/
│   │   └── OCRUpload.css .......... Component styles (NEW)
│   │
│   ├── App.js .................... Updated to add OCR route
│   │                            - Import OCRUploadHandwritten
│   │                            - Add Route path="/ocr-handwritten"
│   │
│   └── api/
│       └── axiosInstance.js ....... API client (existing)
│
└── public/
```

---

**This architecture is designed for:**
- ✅ Ease of use (no OCR key needed!)
- ✅ Reliability (free tier OCR works out of box)
- ✅ Scalability (can upgrade OCR tier if needed)
- ✅ Privacy (no permanent file storage)
- ✅ Accuracy (AI evaluation with concept matching)
