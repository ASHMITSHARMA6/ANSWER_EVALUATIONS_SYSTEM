# Testing Guide

Complete testing scenarios for the vector-driven evaluation system.

---

## Pre-Flight Checklist

Before running any tests:

```bash
# 1. MongoDB running
mongosh
> exit

# 2. Backend dependencies
cd backend
npm install

# 3. Frontend dependencies
cd ../frontend
npm install

# 4. Environment files
cd ../backend
cp .env.example .env
cd ../frontend
cp .env.example .env
```

---

## Test Suite 1: System Startup

### Test 1.1: MongoDB Connection

```bash
# Terminal 1
mongosh

# Should show:
# Connecting to: mongodb://127.0.0.1:27017/?directConnection=true
# [default]>
```

✅ **Pass**: Connected to MongoDB  
❌ **Fail**: "Connection refused"

### Test 1.2: Backend Server Start

```bash
# Terminal 2
cd backend
npm run seed
# Should create teacher account

npm start
# Should show:
# Server running on http://localhost:5000
# [VectorDB] Initialized fresh indices
```

✅ **Pass**: Server running, Vector DB initialized  
❌ **Fail**: Port in use or MongoDB error

### Test 1.3: Frontend Start

```bash
# Terminal 3
cd frontend
npm start
# Should open http://localhost:3000
```

✅ **Pass**: React app loads  
❌ **Fail**: Compilation errors

### Test 1.4: Health Check

```bash
curl http://localhost:5000/api/health | jq '.'

# Should output:
# {
#   "ok": true,
#   "vectorDb": {
#     "material": { "size": 0, "dimension": 1536 },
#     "answers": { "size": 0, "dimension": 1536 },
#     ...
#   }
# }
```

✅ **Pass**: Healthy response with Vector DB stats  
❌ **Fail**: Connection error

---

## Test Suite 2: Authentication

### Test 2.1: Login with Seeded Account

```bash
# API Test
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "teacher123"
  }' | jq '.'

# Should return:
# {
#   "token": "eyJhbGc...",
#   "user": { "_id": "...", "email": "teacher@test.com" }
# }
```

✅ **Pass**: JWT token returned  
❌ **Fail**: "Invalid credentials" or 401

### Test 2.2: Login via Frontend

1. Open http://localhost:3000
2. Login with: `teacher@test.com` / `teacher123`
3. Should redirect to Dashboard

✅ **Pass**: Dashboard visible, logged in  
❌ **Fail**: Login page still visible

### Test 2.3: Protected API Access

```bash
TOKEN="eyJhbGc..."  # From Test 2.1

curl http://localhost:5000/api/results \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Should return empty array initially:
# []
```

✅ **Pass**: Returns 200  
❌ **Fail**: 401 Unauthorized

---

## Test Suite 3: Material Upload & Vector DB

### Test 3.1: Upload Text Material

```bash
TOKEN="..."

curl -X POST http://localhost:5000/api/upload-material \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "material": "Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose. It occurs in the chloroplasts of plant cells. The process has two main stages: light reactions and dark reactions."
  }' | jq '.'

# Should return:
# {
#   "id": "...",
#   "message": "Material uploaded and processed successfully",
#   "chunks": 2,
#   "stats": { "totalChunks": 2, "avgLength": 150, ... }
# }
```

✅ **Pass**: Chunks created, stats returned  
❌ **Fail**: No chunks created

**Backend Log Should Show**:
```
[Upload Material] Added 2 material embeddings. Total: 2
[Chunk] Created 2 chunks
```

### Test 3.2: Verify Vector DB Populated

```bash
curl http://localhost:5000/api/debug/vector-db-stats | jq '.material'

# Should show:
# {
#   "size": 2,
#   "dimension": 1536
# }
```

✅ **Pass**: size > 0  
❌ **Fail**: size = 0

### Test 3.3: Verify Chunks in MongoDB

```bash
mongosh

use tes
db.chunks.count()
# Should show: 2

db.chunks.findOne()
# Should show chunk with text, source, section, etc.
```

✅ **Pass**: Chunks stored  
❌ **Fail**: No chunks found

### Test 3.4: Upload PDF Material (Optional)

1. Create test file: `test.pdf` with text content
2. In frontend: Upload Material → Choose file → Upload
3. Should process same as text

✅ **Pass**: PDF text extracted  
❌ **Fail**: "Could not extract text"

---

## Test Suite 4: Question Generation

### Test 4.1: Generate Questions via API

```bash
TOKEN="..."
MATERIAL_ID="..."  # From Test 3.1

curl -X POST http://localhost:5000/api/generate-questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": "medium",
    "numQuestions": 3
  }' | jq '.'

# Should return:
# {
#   "questions": [
#     "What is photosynthesis?",
#     "Where does photosynthesis occur?",
#     "Describe the two stages of photosynthesis."
#   ],
#   "questionSetId": "...",
#   "retrievedChunks": 2,
#   "message": "Questions generated using vector retrieval"
# }
```

✅ **Pass**: Array of 3 questions, retrievedChunks > 0  
❌ **Fail**: No questions or empty array

**Backend Log Should Show**:
```
[Generate Questions] Retrieved 2 chunks for topic: "undefined"
[AI] OpenAI call successful
```

### Test 4.2: Generate via Frontend

1. Login (from Test 2.2)
2. Ensure material is uploaded
3. Click **Generate Questions**
4. Select difficulty, click **Generate**
5. Should see 5 questions

✅ **Pass**: Questions displayed  
❌ **Fail**: Loading indefinitely or error

### Test 4.3: Different Difficulties

```bash
# Try different difficulties
for difficulty in easy medium hard; do
  curl -X POST http://localhost:5000/api/generate-questions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{ \"difficulty\": \"$difficulty\", \"numQuestions\": 2 }" \
    | jq '.questions'
done
```

✅ **Pass**: All return questions (easy should be simpler)  
❌ **Fail**: Any fails or no difference

---

## Test Suite 5: Model Answer Upload

### Test 5.1: Upload Model Answer via API

```bash
TOKEN="..."

curl -X POST http://localhost:5000/api/upload-model-answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "What is photosynthesis?",
    "modelAnswer": "Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose. It occurs in chloroplasts and has two stages: light reactions and dark reactions.",
    "maxMarks": 10
  }' | jq '.'

# Should return:
# {
#   "id": "...",
#   "message": "Model answer saved"
# }
```

✅ **Pass**: Model answer ID returned  
❌ **Fail**: Error or empty response

### Test 5.2: Verify in Vector DB

```bash
curl http://localhost:5000/api/debug/vector-db-stats | jq '.answers'

# Should show:
# {
#   "size": 1,
#   "dimension": 1536
# }
```

✅ **Pass**: size > 0  
❌ **Fail**: size = 0

### Test 5.3: Upload via Frontend

1. Click **Model Answer**
2. Enter:
   - Question: "What is photosynthesis?"
   - Model Answer: "Complete explanation..."
   - Max Marks: 10
3. Click **Upload**

✅ **Pass**: Confirmation message  
❌ **Fail**: Error

---

## Test Suite 6: Student Answer Upload

### Test 6.1: Upload Student Answer via API

```bash
TOKEN="..."

curl -X POST http://localhost:5000/api/upload-student-answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentAnswer": "Plants use sunlight to make food.",
    "studentName": "John Doe"
  }' | jq '.'

# Should return ID and confirmation
```

✅ **Pass**: Student answer saved  
❌ **Fail**: Error

### Test 6.2: Upload via Frontend

1. Click **Student Answer**
2. Paste: "Plants use sunlight to make food"
3. Name: "Test Student"
4. Click **Upload**

✅ **Pass**: Confirmation  
❌ **Fail**: Error

---

## Test Suite 7: Answer Evaluation (CORE TEST)

### Test 7.1: Evaluate via API

```bash
TOKEN="..."

curl -X POST http://localhost:5000/api/evaluate-answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maxMarks": 10
  }' | jq '.'

# Should return:
# {
#   "evaluationId": "...",
#   "marks": 6,
#   "maxMarks": 10,
#   "matchedConcepts": ["plants", "sunlight", "food"],
#   "missingConcepts": ["chloroplasts", "glucose", "light reactions"],
#   "feedback": "Student understands...",
#   "retrievedChunks": 1,
#   "message": "Evaluation complete using semantic retrieval + LLM"
# }
```

✅ **Pass**: 
- marks between 0-maxMarks
- matchedConcepts array populated
- missingConcepts array populated
- feedback non-empty
- retrievedChunks > 0

❌ **Fail**: Any field missing or invalid

**Backend Log**:
```
[Evaluate Answer] Retrieved 1 model answer chunks
[AI] OpenAI call successful
[Evaluate Answer] Processing complete
```

### Test 7.2: Verify Determinism

Run same evaluation twice, should get identical results:

```bash
# Run Test 7.1 twice

Response 1:
{
  "marks": 6,
  "feedback": "Student understands basic concept..."
}

Response 2:
{
  "marks": 6,
  "feedback": "Student understands basic concept..."  (IDENTICAL)
}
```

✅ **Pass**: Identical (temp=0)  
❌ **Fail**: Different scores or feedback

### Test 7.3: Evaluate via Frontend

1. Ensure model answer uploaded (Test 5.3)
2. Ensure student answer uploaded (Test 6.2)
3. Click **Evaluate Answer**
4. Click **Evaluate**
5. See results with score, concepts, feedback

✅ **Pass**: All evaluation fields visible  
❌ **Fail**: Missing fields or error

### Test 7.4: Test Different Student Answers

Test with varying quality answers:

**High Quality**:
```
"Photosynthesis is the process where plants convert sunlight 
into glucose through light reactions in thylakoids and dark 
reactions in the stroma of chloroplasts."

Expected: 9-10/10
```

**Medium Quality**:
```
"Plants use sunlight to make glucose for energy. 
It happens in chloroplasts."

Expected: 6-8/10
```

**Low Quality**:
```
"Plants need sunlight."

Expected: 2-4/10
```

**Off-Topic**:
```
"Mitochondria are the powerhouse of the cell."

Expected: 0-1/10
```

✅ **Pass**: Scores correlate with quality  
❌ **Fail**: Scores don't reflect quality

### Test 7.5: Partial Credit Test

Model answer has 5 key concepts. Student answer has 3.

```
Model: "Process [1] + sunlight [2] → glucose [3] + chloroplasts [4] + two stages [5]"
Student: "Sunlight [2] → food/energy [3] + happens in plant cells"

Expected: ~5-7/10 (60% concepts covered)
```

✅ **Pass**: Score reflects 3/5 concepts  
❌ **Fail**: Full marks or zero

---

## Test Suite 8: Results & Data Persistence

### Test 8.1: View All Results via API

```bash
TOKEN="..."

curl http://localhost:5000/api/results \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Should return array of evaluations:
# [
#   {
#     "_id": "...",
#     "studentName": "John Doe",
#     "marks": 6,
#     "maxMarks": 10,
#     "feedback": "...",
#     "matchedConcepts": [...],
#     "missingConcepts": [...],
#     "evaluationMethod": "vector_retrieval_llm",
#     "retrievedChunkCount": 1,
#     "createdAt": "2026-02-03T..."
#   }
# ]
```

✅ **Pass**: Array with evaluations  
❌ **Fail**: Empty or error

### Test 8.2: View Results in Frontend

1. Click **Results**
2. Should see table with:
   - Student name
   - Marks / Max marks
   - Question
   - Feedback
   - Concepts matched/missing

✅ **Pass**: All data visible  
❌ **Fail**: Table empty or missing columns

### Test 8.3: MongoDB Persistence

```bash
mongosh
use tes

# Check evaluations
db.evaluationresults.count()
# Should be > 0

db.evaluationresults.findOne()
# Should show full evaluation with matchedConcepts, feedback, etc.

# Check chunks
db.chunks.count()
# Should be > 0
```

✅ **Pass**: Data in MongoDB  
❌ **Fail**: No data

### Test 8.4: Vector DB Persistence

```bash
# Check file exists
ls -la backend/data/vector_db.json

# Check size
du -h backend/data/vector_db.json

# Should be > 0 KB
```

✅ **Pass**: File exists and has size  
❌ **Fail**: File missing or 0 KB

---

## Test Suite 9: Fallback & Error Handling

### Test 9.1: Fallback without API Key

1. Edit `backend/.env`:
   ```
   OPENAI_API_KEY=
   ```

2. Restart backend

3. Try question generation and evaluation

Expected: Uses mock embeddings (slower but works)

**Backend Log**:
```
[Embedding] OPENAI_API_KEY not set. Using mock embeddings.
[AI] OPENAI_API_KEY not set. Using fallback response.
```

✅ **Pass**: System still works with mock  
❌ **Fail**: Errors or crashes

### Test 9.2: Invalid API Key

1. Edit `backend/.env`:
   ```
   OPENAI_API_KEY=sk-invalid-key
   ```

2. Try evaluation

Expected: Fallback kicks in

**Backend Log**:
```
[AI] OpenAI API error: 401 Invalid API key
[AI] Falling back to mock embeddings
```

✅ **Pass**: Graceful fallback  
❌ **Fail**: Crashes

### Test 9.3: MongoDB Down

1. Stop MongoDB: `mongosh` → `quit`
2. Try to upload material
3. Should get error: "Cannot connect to MongoDB"

✅ **Pass**: Clear error message  
❌ **Fail**: Cryptic error

### Test 9.4: Empty/Invalid Input

```bash
# No material uploaded, try to generate questions
curl -X POST http://localhost:5000/api/generate-questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq '.'

# Should return:
# { "error": "Upload study material first" }
```

✅ **Pass**: Clear error  
❌ **Fail**: Crash or 500 error

---

## Test Suite 10: Performance & Load

### Test 10.1: Single Evaluation Time

```bash
# Time a single evaluation
time curl -X POST http://localhost:5000/api/evaluate-answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

# Should complete in 3-5 seconds
```

✅ **Pass**: < 5 seconds  
⚠️ **Warn**: 5-10 seconds (slow network?)  
❌ **Fail**: > 10 seconds

### Test 10.2: Batch Evaluation (5 students)

```bash
# Upload 5 different student answers and evaluate each
for i in {1..5}; do
  echo "Evaluation $i"
  curl -X POST http://localhost:5000/api/upload-student-answer ...
  curl -X POST http://localhost:5000/api/evaluate-answer ...
  sleep 2  # Wait for previous to complete
done

# Total time should be ~15-20 seconds
```

✅ **Pass**: All complete without timeout  
❌ **Fail**: Some timeout or fail

### Test 10.3: Vector DB Size Growth

```bash
# After 10 materials
du -h backend/data/vector_db.json
# Expected: ~100KB

# After 100 materials
du -h backend/data/vector_db.json
# Expected: ~1MB
```

✅ **Pass**: Grows predictably  
❌ **Fail**: Explodes or corrupts

---

## Test Suite 11: Cross-Browser & Frontend

### Test 11.1: Chrome

1. Open http://localhost:3000
2. Test all workflows (login, upload, evaluate, results)

✅ **Pass**: Everything works  
❌ **Fail**: UI broken or network errors

### Test 11.2: Firefox

Same as Test 11.1

### Test 11.3: Safari

Same as Test 11.1

---

## Test Suite 12: Integration Test (Full Workflow)

**Complete workflow from login to results**:

1. ✅ Login with seeded account
2. ✅ Upload material (photosynthesis)
3. ✅ Generate 3 questions
4. ✅ Upload model answer (for question 1)
5. ✅ Upload student answer (partial)
6. ✅ Evaluate answer (should get ~6/10)
7. ✅ Upload second student answer (better)
8. ✅ Evaluate (should get ~9/10)
9. ✅ View results (both evaluations visible)
10. ✅ Check MongoDB (data persisted)

**Total time**: 2-3 minutes  
**Cost**: < $0.05 in API calls

✅ **Pass**: All steps complete, data correct  
❌ **Fail**: Any step fails

---

## Passing Criteria

### Must Pass ✅
- [ ] Test Suite 1 (Startup)
- [ ] Test Suite 2 (Auth)
- [ ] Test Suite 3 (Material)
- [ ] Test Suite 5 (Model Answer)
- [ ] Test Suite 6 (Student Answer)
- [ ] Test Suite 7.1 (Evaluation)
- [ ] Test Suite 8 (Results)

### Should Pass ✅
- [ ] Test Suite 4 (Questions)
- [ ] Test Suite 7 (All eval tests)
- [ ] Test Suite 9 (Fallbacks)
- [ ] Test Suite 10 (Performance)
- [ ] Test Suite 12 (Integration)

### Nice to Have ✅
- [ ] Test Suite 11 (Multi-browser)
- [ ] All edge cases
- [ ] Load testing

---

## Debugging Tips

### Backend Logs
Monitor in Terminal 2:
```bash
cd backend && npm start
```

Useful log patterns:
- `[VectorDB]` - Vector DB operations
- `[Embedding]` - Embedding generation
- `[AI]` - LLM calls
- `[Upload Material]` - Material processing
- `[Evaluate Answer]` - Evaluation flow

### Frontend Logs
Open browser DevTools: `F12`

Check:
- **Console** for JavaScript errors
- **Network** for API calls (see request/response)
- **Application** for stored tokens

### MongoDB Debugging
```bash
mongosh
use tes

# Count documents
db.users.count()
db.studymaterials.count()
db.chunks.count()
db.evaluationresults.count()

# View latest evaluation
db.evaluationresults.findOne({}, {sort: {createdAt: -1}})
```

### Vector DB Debugging
```bash
# Stats
curl http://localhost:5000/api/debug/vector-db-stats | jq '.'

# Check JSON file
cat backend/data/vector_db.json | jq '.material | length'
```

---

## Success Criteria

After running all tests:
- ✅ No crashes or unhandled errors
- ✅ All API endpoints return valid JSON
- ✅ Answer evaluation shows matched/missing concepts
- ✅ Feedback is meaningful and fair
- ✅ Scores consistent across runs (temp=0)
- ✅ Data persists in MongoDB
- ✅ Vector DB works without API key
- ✅ System handles errors gracefully

**Ready for academic evaluation! 🎓**