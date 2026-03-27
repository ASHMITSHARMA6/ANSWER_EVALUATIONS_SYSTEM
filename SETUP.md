# ⚡ QUICK START - Setup & Run Locally

## What You Need

```
Node.js 18+
MongoDB (local or Atlas)
OpenAI API key (optional)
```

---

## 3-Step Setup

### Terminal 1: Backend

```bash
cd /home/ansh/Desktop/TES/backend

cp .env.example .env
# Edit .env:
#   MONGODB_URI=mongodb://localhost:27017/evaluation_db
#   JWT_SECRET=your-secret-key-here-long-key
#   OPENAI_API_KEY=sk-your-key (optional)

npm install
npm run seed
npm start
# Expect: Server running at http://localhost:5000
```

### Terminal 2: Frontend

```bash
cd /home/ansh/Desktop/TES/frontend

cp .env.example .env

npm install
npm start
# Expect: Frontend at http://localhost:3000
```

### Open Browser

```
http://localhost:3000

Login:
  Email: teacher@test.com
  Password: teacher123
```

---

## Workflow

### 1️⃣ Upload Study Material
- Dashboard → Upload Material
- Paste text or upload PDF
- System chunks & embeds

### 2️⃣ Upload Model Answer
- Dashboard → Upload Model Answer
- Enter question + ideal answer
- Ready for evaluation

### 3️⃣ **Batch Upload Student Answers** [NEW]
- Dashboard → **Batch Upload**
- Select folder with answer files
- System processes ONE-BY-ONE:
  - Extract text
  - Generate embedding
  - Query vector DB (top-5 chunks)
  - LLM evaluation
  - Save results

**Supports**: PDF, TXT, JSON files

### 4️⃣ View Results
- Dashboard → Results
- See scores, concepts, feedback per file

---

## Features

| Feature | How to Use |
|---------|-----------|
| Single answer eval | Upload Student Answer → Evaluate |
| **Batch answer eval** | Batch Upload → Select folder → Process |
| Model answer setup | Upload Model Answer |
| Material chunking | Upload Material (auto) |
| Vector DB retrieval | Automatic (under hood) |
| LLM evaluation | Automatic (temp=0 for consistency) |

---

## Troubleshooting

**Backend fails?**
```bash
# Check MongoDB
# Check .env file
rm -rf node_modules && npm install
npm start
```

**Frontend fails?**
```bash
rm -rf node_modules && npm install
npm start
```

**Batch upload stuck?**
- Check file formats (PDF, TXT, JSON only)
- Check file sizes (<50MB each)
- Check model answer uploaded

---

## File Structure

```
TES/
├── START.md                          ← You are here
├── backend/
│   ├── .env.example
│   ├── src/
│   │   ├── services/
│   │   │   ├── vectorDbService.js   ← Vector DB (FAISS)
│   │   │   ├── embeddingService.js  ← OpenAI embeddings
│   │   │   ├── chunkingService.js   ← Text chunking
│   │   │   └── aiService.js         ← LLM prompts
│   │   └── routes/
│   │       ├── uploadMaterial.js
│   │       ├── uploadModelAnswer.js
│   │       ├── batchUploadAnswers.js ← NEW: Batch processing
│   │       └── evaluateAnswer.js
│   └── package.json
└── frontend/
    ├── .env.example
    ├── src/
    │   ├── components/
    │   │   ├── BatchUploadAnswers.js  ← NEW: Batch UI
    │   │   ├── Navbar.js              ← Updated
    │   │   └── ResultsView.js
    │   └── routes.js                  ← Updated
    └── package.json
```

---

## What Batch Upload Does

```
User selects folder with 10 answer files
         ↓
System reads all files
         ↓
For each file (sequential, with progress):
  1. Extract text (PDF/TXT parser)
  2. Generate embedding (OpenAI or mock)
  3. Query vector DB: "What chunks in model answer are similar?"
  4. LLM compares: "How similar are student & model answers?"
  5. Output: Score (0-100), Matched concepts, Missing concepts, Feedback
  6. Save to database
  7. Show result in UI
  8. Move to next file
         ↓
Results display:
  - Individual scores per file
  - Aggregate stats (avg, min, max, time)
  - Detailed feedback per file
```

---

## API Endpoints

```bash
# Login
POST /api/auth/login
Body: {"email":"...","password":"..."}
Returns: {token}

# Upload material
POST /api/upload-material
Headers: Authorization: Bearer <token>
Body: {"text":"..."}

# Upload model answer
POST /api/upload-model-answer
Headers: Authorization: Bearer <token>
Body: {"question":"...","answer":"..."}

# Batch upload answers
POST /api/batch-upload-answers
Headers: Authorization: Bearer <token>
Body: FormData with files[]
Returns: {results: [{filename, score, matchedConcepts, missingConcepts, feedback}], summary}

# Get results
GET /api/results
Headers: Authorization: Bearer <token>
Returns: [evaluations...]

# Health check
GET /api/health
Returns: {ok: true, vectorDb: {material, answers}}
```

---

## Example: Full Workflow

```
1. Login with teacher@test.com / teacher123

2. Upload Material:
   - Text: "Photosynthesis happens in chloroplasts. 
           Light reactions use thylakoids. 
           Dark reactions use stroma. 
           Chlorophyll absorbs light."
   
3. Upload Model Answer:
   - Question: "Explain photosynthesis stages"
   - Answer: "Light reactions produce ATP in thylakoids. 
             Dark reactions produce glucose in stroma."
   
4. Batch Upload (NEW):
   - Create folder: ~/answers/
   - Add files: student1.pdf, student2.txt, student3.pdf
   - Go to: Batch Upload
   - Select folder → Upload & Process
   
5. System processes each:
   - student1.pdf → Score: 85/100, Matched: [ATP, glucose], Missing: [thylakoids]
   - student2.txt → Score: 72/100, Matched: [reactions], Missing: [thylakoids, stroma]
   - student3.pdf → Score: 91/100, Matched: [ATP, glucose, stroma], Missing: []
   
6. Results shown:
   - Average: 82.7/100
   - Range: 72-91
   - Total time: 8.3 seconds
   - Each result: Score + Concepts + Feedback

7. View Results tab:
   - See all evaluations with timestamps
```

---

## Environment Variables

**Backend (.env)**:
```
MONGODB_URI=mongodb://localhost:27017/evaluation_db
JWT_SECRET=your-long-secret-key-here
OPENAI_API_KEY=sk-your-api-key (optional)
PORT=5000
```

**Frontend (.env)**:
```
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_DEBUG=false
```

---

## Key Concepts

**Vector Database**: Stores embeddings of model answer chunks. When you submit a student answer, we:
1. Convert student answer to embedding
2. Find most similar model answer chunks
3. Show LLM only those chunks
4. LLM scores based on retrieved context

**Why?** Prevents hallucination. LLM never sees knowledge outside model answer.

**Temperature=0**: Ensures consistent scoring. Same student answer always gets same score.

**Batch Processing**: One-by-one evaluation with progress tracking. All results saved.

---

## Next Steps

1. ✅ Follow START.md (right now)
2. ✅ Start backend + frontend
3. ✅ Login and complete first workflow
4. ✅ Upload study material
5. ✅ Upload model answer
6. ✅ **Try batch upload** (new feature!)
7. ✅ View results
8. ✅ Customize prompts if needed

---

## Success Checklist

- [ ] Backend running: `http://localhost:5000/api/health` returns OK
- [ ] Frontend running: `http://localhost:3000` loads
- [ ] Login works: teacher@test.com / teacher123
- [ ] Material upload works: Shows success message
- [ ] Model answer uploaded: Ready for evaluation
- [ ] Batch upload visible: In navbar as "Batch Upload"
- [ ] Batch process works: Select folder → Files process → Results show
- [ ] Results display: Scores + concepts + feedback visible

---

**Done! You're ready to evaluate answers. 🚀**

Open http://localhost:3000 and start using the system.

For advanced setup, see:
- ARCHITECTURE.md (design)
- PROMPTS.md (customize AI)
- RUN.md (detailed guide)
