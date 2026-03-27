# STARTUP INSTRUCTIONS - Vector Evaluation System

**Setup time: 10 minutes | All-in-one guide**

---

## PREREQUISITES

✓ Node.js 18+ installed  
✓ MongoDB running (local or Atlas connection string)  
✓ OpenAI API key (optional - system works without it)  

---

## STEP 1: Backend Setup (Terminal 1)

```bash
cd /home/ansh/Desktop/TES/backend

# Copy environment file
cp .env.example .env

# Edit .env with your details (nano, vim, or VS Code)
nano .env
```

**Must set in .env:**
```
MONGODB_URI=mongodb://localhost:27017/evaluation_db
JWT_SECRET=your-secret-key-here-min-32-chars-long
OPENAI_API_KEY=sk-your-api-key (optional, system works without it)
```

**Then install and seed:**
```bash
npm install
npm run seed
```

**Start backend:**
```bash
npm start
```

**Expected output:**
```
✓ Database connected
✓ Vector DB initialized
✓ Server running at http://localhost:5000
```

---

## STEP 2: Frontend Setup (Terminal 2)

```bash
cd /home/ansh/Desktop/TES/frontend

# Copy environment file
cp .env.example .env

# Install and start
npm install
npm start
```

**Expected output:**
```
✓ Compiled successfully!
✓ Frontend at http://localhost:3000
```

---

## STEP 3: Open in Browser

```
http://localhost:3000
```

**Login:**
- Email: `teacher@test.com`
- Password: `teacher123`

---

## WORKFLOW - Complete End-to-End

### 1. Upload Study Material

**Go to:** Dashboard → Upload Material

**Upload options:**
- Paste text directly (JSON)
- Upload PDF file

**What happens:**
- Text is chunked (4-sentence chunks with overlap)
- Embeddings generated (OpenAI or mock)
- Vectors stored in FAISS index
- Ready for questions & evaluation

**Example text:**
```
The photosynthesis process occurs in two main stages: 
light reactions and dark reactions. Light reactions 
happen in the thylakoid membrane. The Calvin cycle 
occurs in the stroma. Chlorophyll absorbs light energy.
```

---

### 2. Upload Model Answer

**Go to:** Dashboard → Upload Model Answer

**Upload:**
- Question text
- Model answer (ideal answer, sentence by sentence)

**What happens:**
- Stored in database
- Ready for student answer comparison

**Example:**
```
Question: "Explain photosynthesis stages"

Model Answer: "The two main stages are light reactions 
and dark reactions. Light reactions occur in thylakoid 
membranes and produce ATP and NADPH. Dark reactions 
(Calvin cycle) use these to produce glucose in stroma."
```

---

### 3. **BATCH UPLOAD STUDENT ANSWERS** [NEW FEATURE]

**Go to:** Dashboard → Batch Upload Answers

**Steps:**
1. Click "Select Folder"
2. Choose folder with answer files (PDF, TXT, DOCX, JSON)
3. Click "Upload & Process"
4. System processes one by one:
   - Extracts text from file
   - Generates evaluation
   - Saves results to database
   - Moves to next file

**Folder structure expected:**
```
student_answers/
├── student1_answer.pdf
├── student2_answer.txt
├── student3_answer.pdf
└── student4_answer.json
```

**What happens per file:**
```
Processing: student1_answer.pdf
1. Extract text from file
2. Generate embedding
3. Query vector DB (top-5 similar chunks from model answer)
4. LLM evaluation (temp=0 for consistency)
5. Calculate matched/missing concepts
6. Generate feedback
7. Store results
8. Move to next file

✓ Results: 85/100, Matched: [concept1, concept2], Missing: [concept3]
```

**Results display:**
- File-by-file scores
- Concepts understood
- Concepts missed
- Detailed feedback
- Total time for batch

---

### 4. View Results

**Go to:** Dashboard → Results View

**See:**
- All evaluations
- Scores
- Matched concepts
- Missing concepts
- Feedback
- Timestamp

**Export:** (Coming soon) Download CSV

---

## FILE FORMATS SUPPORTED

**Batch Upload accepts:**
- `.pdf` - Text-based PDFs
- `.txt` - Plain text files
- `.docx` - Word documents
- `.json` - JSON format: `{ "answer": "text here" }`

---

## TROUBLESHOOTING

### Backend won't start
```bash
# Check MongoDB is running
# Check port 5000 is free
# Check .env has MONGODB_URI set
# Delete node_modules and reinstall
rm -rf node_modules
npm install
npm start
```

### Frontend won't start
```bash
# Check port 3000 is free
# Clear npm cache
npm cache clean --force
rm -rf node_modules
npm install
npm start
```

### Login fails
```bash
# Check seeding worked
npm run seed
# Verify credentials in .env
# Check MONGODB_URI is correct
```

### Batch upload fails
```bash
# Check folder exists
# Check file formats are supported
# Check file sizes (<50MB per file)
# Check PDF is text-based (not scanned image)
```

### Evaluations not working
```bash
# Check model answer is uploaded
# Check OpenAI API key (optional)
# System falls back to mock if API key missing
# Check vector DB stats: http://localhost:5000/api/health
```

---

## QUICK API TEST

**Without frontend, test backend directly:**

```bash
# 1. Login and get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@test.com","password":"teacher123"}'
# Returns: { "token": "jwt-token-here" }

# 2. Use token in other requests
TOKEN="your-token-here"

# 3. Upload material
curl -X POST http://localhost:5000/api/upload-material \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Study material here..."}'

# 4. Upload model answer
curl -X POST http://localhost:5000/api/upload-model-answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Q?","answer":"Model answer..."}'

# 5. Evaluate student answer
curl -X POST http://localhost:5000/api/evaluate-answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentAnswer":"Student answer..."}'
```

---

## WHAT'S HAPPENING UNDER THE HOOD

### Batch Upload Process

```
User selects folder with 5 student answers
                    ↓
System reads folder, finds 5 files
                    ↓
For each file (sequential):
    1. Extract text (PDF/DOCX/TXT parser)
    2. Generate embedding (OpenAI or mock)
    3. Query vector DB for top-5 model answer chunks
    4. Build evaluation prompt with retrieved chunks
    5. LLM scores student answer (temp=0 = deterministic)
    6. Parse JSON response → matched[], missing[], score
    7. Save to MongoDB
    8. Show progress (2/5 complete)
                    ↓
Display results:
  - Individual scores per file
  - Aggregate stats
  - Export option
```

### Why This Works

✅ **No hallucination**: LLM only sees model answer chunks  
✅ **Consistent**: temperature=0 means same input = same score  
✅ **Fast**: Batch processes all files sequentially  
✅ **Transparent**: See what concepts matched/missed  
✅ **Scalable**: Can process 100s of answers in one batch  

---

## MONITORING DURING BATCH UPLOAD

**Watch the progress:**
- Real-time file processing count
- Current file being evaluated
- Results for completed files
- Estimated time remaining
- Any errors (highlighted in red)

**After batch completes:**
- Summary: 5/5 complete
- Aggregate: Average score 78/100
- Range: 65-92 score distribution
- Export results as CSV

---

## SYSTEM ARCHITECTURE (Quick Version)

```
Student Answers (Folder)
         ↓
   File Extract
         ↓
   Embedding → Vector DB Query
         ↓
   Retrieve Model Answer Chunks
         ↓
   LLM Evaluation (with context only)
         ↓
   Parse: Score + Concepts
         ↓
   Save to MongoDB
         ↓
   Display Results
```

**Key point:** LLM never sees raw answers - only relevant model answer context + student answer.

---

## FEATURES AT A GLANCE

| Feature | Status | How |
|---------|--------|-----|
| Material Upload | ✅ Dashboard → Upload Material |
| Single Answer Eval | ✅ Dashboard → Upload Student Answer |
| **Batch Answer Eval** | ✅ Dashboard → Batch Upload Answers |
| Model Answer Upload | ✅ Dashboard → Upload Model Answer |
| Question Generation | ✅ Dashboard → Generate Questions |
| Results View | ✅ Dashboard → Results |
| Vector DB Stats | ✅ API: /api/health |
| Mock Fallback | ✅ Works without API key |

---

## AFTER FIRST RUN

### Customize Evaluation Prompts

Edit: `/home/ansh/Desktop/TES/backend/src/services/aiService.js`

Find: `EVAL_SYSTEM` and `QUESTION_GEN_SYSTEM`

Modify prompts as needed for your use case.

### Change Rubrics

Edit evaluation prompt:
```javascript
const rubric = {
  perfect: "Student shows complete understanding",
  partial: "Student understands most concepts",
  poor: "Student misses key concepts"
}
```

### Performance Tuning

Edit: `/home/ansh/Desktop/TES/backend/src/services/chunkingService.js`

Adjust:
- `chunkSize` (default: 4 sentences)
- `overlap` (default: 1 sentence)
- `minLength` (default: 30 chars)

---

## COMMON TASKS

### Add a new teacher
```bash
# Login as teacher, go to Settings (future feature)
# Or use API endpoint
```

### Change default credentials
Edit: `/home/ansh/Desktop/TES/backend/.env`
```
DEFAULT_TEACHER_EMAIL=your-email@test.com
DEFAULT_TEACHER_PASSWORD=your-password-here
```

### Increase batch file limit
Edit: `/home/ansh/Desktop/TES/backend/src/routes/batchUploadAnswers.js`
```javascript
const MAX_FILES = 100; // change from current value
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

### Debug vector DB
```
Go to: http://localhost:5000/api/debug/vector-db-stats
See:
- Material chunks stored
- Answer chunks stored
- Vector dimensions
- Similarity calculation stats
```

---

## SUCCESS CHECKLIST

After following these steps:

- [ ] Terminal 1: Backend running (`npm start`)
- [ ] Terminal 2: Frontend running (`npm start`)
- [ ] Browser: Logged in at `http://localhost:3000`
- [ ] Upload material: Success message shown
- [ ] Upload model answer: Success message shown
- [ ] Batch upload folder: Files processed one-by-one
- [ ] Results view: Scores and concepts visible
- [ ] API test: `/api/health` returns OK

---

## NEXT: DEPLOY TO PRODUCTION

Once tested locally:

1. Set environment variables on server
2. Run MongoDB instance
3. Deploy backend to Node.js server (Heroku, AWS, DigitalOcean)
4. Deploy frontend to static hosting (Vercel, Netlify)
5. Update API_BASE_URL in frontend .env
6. Done!

---

## NEED HELP?

**System won't start:**
→ Check terminal errors, verify .env file, check MongoDB connection

**Evaluations failing:**
→ Check model answer uploaded, check vector DB stats endpoint

**Batch upload stuck:**
→ Check file formats, reduce file size, check available disk space

**Results not showing:**
→ Refresh browser, check MongoDB connection, check API response

---

**You're ready! Open http://localhost:3000 and start evaluating. 🚀**
