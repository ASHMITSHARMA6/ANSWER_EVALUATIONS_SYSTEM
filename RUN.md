# Vector-Driven Teacher Evaluation System

**Academic Prototype for AI-Assisted Question Generation & Automated Answer Evaluation**

## Overview

This system uses a **vector database (FAISS)** for semantic answer evaluation instead of direct LLM comparison. This ensures:
- ✅ **No hallucination**: LLM only sees retrieved model-answer context
- ✅ **Semantic matching**: Vector similarity finds relevant answer chunks
- ✅ **Partial credit**: Rubric-based scoring with detailed feedback
- ✅ **Transparent**: Full traceability of what context was used for evaluation

See `ARCHITECTURE.md` for detailed system design.

---

## Quick Start

### Prerequisites
- **Node.js 18+** (check: `node --version`)
- **MongoDB** (local or Atlas)
- **OpenAI API key** (optional, falls back to mock embeddings)

### 1️⃣ Backend Setup

```bash
cd backend

# Copy and edit environment variables
cp .env.example .env
# Edit .env: set MONGODB_URI, OPENAI_API_KEY (optional), JWT_SECRET

# Install dependencies
npm install
```

### 2️⃣ Seed Teacher Account (First Time Only)

```bash
npm run seed
# Creates: teacher@test.com / teacher123 (from .env defaults)
```

### 3️⃣ Start Backend Server

```bash
npm start
# Backend running at: http://localhost:5000
# API endpoints at: http://localhost:5000/api
```

Check health: `curl http://localhost:5000/api/health`

---

## 4️⃣ Frontend Setup (New Terminal)

```bash
cd frontend

# Copy and edit environment variables
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm start
# Frontend at: http://localhost:3000
```

---

## 5️⃣ Usage Workflow

### Open in Browser
```
http://localhost:3000
```

### Step-by-Step Workflow

#### 1. **Login**
- Email: `teacher@test.com`
- Password: `teacher123`
- (Or register a new account)

#### 2. **Upload Study Material**
- Go to: **Upload Material** tab
- Paste text OR upload a PDF file (text-based)
- Backend:
  - Chunks the text (sentence-level with overlap)
  - Generates embeddings via OpenAI (or mock)
  - Stores vectors in FAISS index
  - Saves metadata to MongoDB
- ✓ System ready for question generation

#### 3. **Generate Questions** (Optional)
- Go to: **Generate Questions** tab
- Click "Generate"
- Backend:
  - Retrieves top chunks from FAISS (using material)
  - Calls ChatGPT with only retrieved context
  - Returns questions that can be answered from material
- ✓ Use these for your exam paper

#### 4. **Upload Model Answer**
- Go to: **Model Answer** tab
- Enter: Question text, ideal answer, max marks (e.g., 10)
- Backend:
  - Chunks the answer
  - Generates embeddings
  - Stores in FAISS answer index
  - Saves to MongoDB

#### 5. **Evaluate Student Answer** (Core Feature)
- Go to: **Evaluate Answer** tab
- Enter: Student's answer (paste their response)
- Click "Evaluate"
- **Critical Process**:
  1. Embed student answer
  2. Query FAISS: retrieve top-5 model-answer chunks
  3. Build eval prompt with:
     - Question
     - Retrieved model-answer chunks
     - Student answer
     - Rubric
  4. ChatGPT scores **strictly** on retrieved context
  5. Output: JSON with score, matched concepts, feedback
- ✓ View score + detailed feedback

#### 6. **View Results**
- Go to: **Results** tab
- See all evaluations with:
  - Marks & max marks
  - Matched/missing concepts
  - AI feedback
  - Retrieval details (how many chunks used)

---

## API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/register
```

### Material Management
```
POST /api/upload-material
  Body: { material: "text..." } or multipart PDF
  Returns: { id, chunks, stats }

GET /api/debug/vector-db-stats
  Returns: Vector DB index sizes and info
```

### Question Generation
```
POST /api/generate-questions
  Body: { difficulty: "medium", numQuestions: 5, topic?: "optional" }
  Returns: { questions: [...], retrievedChunks: N }
```

### Answer Evaluation (Main Feature)
```
POST /api/evaluate-answer
  Body: { maxMarks?: 10, rubric?: "optional" }
  Returns: {
    marks: 6,
    maxMarks: 10,
    matchedConcepts: [...],
    missingConcepts: [...],
    feedback: "...",
    retrievedChunks: 5
  }
```

### Results
```
GET /api/results
  Returns: [{ id, studentName, marks, maxMarks, feedback, ... }]
```

---

## Configuration

### .env Example (Backend)

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/tes

# JWT
JWT_SECRET=use_openssl_rand_hex_32_for_production

# OpenAI (leave blank for mock embeddings)
OPENAI_API_KEY=sk-proj-your-key-here

# Server
PORT=5000

# Seeding
SEED_EMAIL=teacher@test.com
SEED_PASSWORD=teacher123
```

### Verify Setup

```bash
# Check MongoDB
mongosh  # or: mongo
> use tes
> db.users.find()

# Check OpenAI (if key provided)
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models | jq '.data[] | .id' | head -5

# Check Vector DB stats
curl http://localhost:5000/api/debug/vector-db-stats
```

---

## How Vector Evaluation Works

### The Problem with Direct LLM Comparison
❌ Old approach:
```
LLM.compare(model_answer, student_answer)
↳ LLM uses external knowledge
↳ Can hallucinate facts not in model answer
↳ Hard to explain why a score was given
```

### The Solution: Semantic Retrieval + Controlled LLM
✅ New approach:
```
1. Embed student_answer → vector
2. Query FAISS: similar_chunks = retrieve(vector, k=5)
3. Build prompt with ONLY similar_chunks
4. LLM scores: evaluate(question, similar_chunks, student_answer)
↳ LLM CANNOT use external knowledge
↳ Scoring is transparent and reproducible
↳ Each evaluation shows retrieved context
```

### Example Evaluation Flow

**Question**: *"What is photosynthesis?"*

**Model Answer** (stored + chunked):
> "Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose. It occurs in the chloroplasts of plant cells."

**Student Answer**:
> "Plants use sunlight to make food."

**Retrieval**:
- Embed: "Plants use sunlight to make food." → vector
- Query FAISS with this vector
- Retrieve top 1 chunk from model answer (high similarity)

**Evaluation Prompt** (to LLM):
```
Question: What is photosynthesis?

Model Answer Context (ONLY reference this):
Photosynthesis is the process by which plants convert sunlight 
into chemical energy stored in glucose. It occurs in the 
chloroplasts of plant cells.

Student Answer:
Plants use sunlight to make food.

Score out of 10. Do NOT use external knowledge.
Return JSON: { score, matched_concepts, missing_concepts, feedback }
```

**LLM Output**:
```json
{
  "score": 6,
  "max_score": 10,
  "matched_concepts": ["photosynthesis", "sunlight", "food/energy"],
  "missing_concepts": ["chloroplasts", "glucose", "chemical energy"],
  "feedback": "Student understands the basic concept (sunlight → food) 
             but lacks specificity about location and energy form. 
             Good foundation for a 6/10."
}
```

---

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
→ Start MongoDB:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### OpenAI API 401 Error
```
Error: Invalid API key
```
→ Check your `OPENAI_API_KEY` in `.env`:
```bash
echo $OPENAI_API_KEY
# If empty, get key from: https://platform.openai.com/api-keys
```

→ If no key, system uses mock embeddings (still works, less accurate)

### Vector DB File Not Found
```
Error: VECTOR_DB_FILE not found
```
→ Vector DB is created automatically on first material upload. No action needed.

### Port 5000 Already in Use
```
Error: listen EADDRINUSE :::5000
```
→ Use different port:
```bash
PORT=5001 npm start
```

---

## Architecture Summary

### Data Flow

```
Teacher Uploads Material
  ↓
[Chunking] Split text into semantic chunks
  ↓
[Embedding] Generate 1536-dim vectors (OpenAI or mock)
  ↓
[FAISS Index] Store vectors + metadata (in-memory or disk)
  ↓
[MongoDB] Store chunks metadata for reference
  ↓
---
Question Generation Request
  ↓
[Vector Query] Find top chunks similar to question
  ↓
[LLM] Generate questions from retrieved chunks ONLY
  ↓
---
Student Answer Evaluation
  ↓
[Embedding] Embed student's answer
  ↓
[Vector Query] Find top model-answer chunks
  ↓
[Eval Prompt] Build prompt with retrieved context
  ↓
[LLM] Score based on ONLY retrieved model answer
  ↓
[Result] Save score + feedback + matched concepts
```

### Data Models

**StudyMaterial**
- `teacherId`, `content`, `createdAt`

**Chunk** (metadata for vector retrieval)
- `text`, `source` (materialId), `section`, `order`, `userId`

**ModelAnswer**
- `questionText`, `modelAnswer`, `maxMarks`, `teacherId`

**StudentAnswer**
- `studentAnswer`, `studentName`, `teacherId`

**EvaluationResult** (VECTOR-ENHANCED)
- `marks`, `maxMarks`, `studentName`
- **NEW**: `matchedConcepts[]`, `missingConcepts[]`, `feedback`, `retrievedChunkCount`

**FAISS Indices** (In-memory JSON)
- `material_index`: Text chunks with embeddings
- `answers_index`: Model answer chunks with embeddings

---

## Advanced Features (Optional)

### Multiple Materials per Teacher
Currently loads the latest material. Modify routes to support:
```javascript
POST /api/upload-material
Body: { material, materialName, topic }
```

### Topic-Based Question Generation
```javascript
POST /api/generate-questions
Body: { difficulty, numQuestions, topic: "photosynthesis" }
```
Routes: `generateQuestions.js` already supports `topic` parameter

### Rubric-Based Scoring
Customize evaluation with detailed rubrics:
```javascript
POST /api/evaluate-answer
Body: {
  rubric: {
    fullMarks: "Mentions all: definition, process, location",
    partialMarks: "Mentions 2/3 of above",
    zeroMarks: "Off-topic or vague"
  }
}
```

### Export Results
```javascript
GET /api/results?format=csv
GET /api/results?format=json
```

---

## Development Commands

```bash
# Backend
cd backend
npm start              # Production mode
npm run dev           # Watch mode (auto-restart)
npm run seed          # Seed teacher account

# Frontend
cd frontend
npm start             # Dev server with hot reload
npm run build         # Production build
npm test              # Run tests

# Database
mongosh               # MongoDB shell
```

---

## Production Deployment Checklist

- [ ] Set strong `JWT_SECRET` (use `openssl rand -hex 32`)
- [ ] Use MongoDB Atlas (not local)
- [ ] Add real `OPENAI_API_KEY`
- [ ] Set `FRONTEND_URL` for CORS
- [ ] Enable HTTPS
- [ ] Rate limit API endpoints
- [ ] Add request logging
- [ ] Use persistent FAISS indices (HDF5 or Postgres pgvector)
- [ ] Set `NODE_ENV=production`
- [ ] Add error monitoring (Sentry, etc.)

---

## References

- **ARCHITECTURE.md**: System design and vector DB concepts
- **OpenAI API**: https://platform.openai.com/docs
- **FAISS**: https://github.com/facebookresearch/faiss
- **MongoDB**: https://www.mongodb.com/docs
- **Express**: https://expressjs.com
- **React**: https://react.dev

---

## Support

For issues:
1. Check MongoDB is running: `mongosh`
2. Check OpenAI API key: `echo $OPENAI_API_KEY`
3. Check vector DB file: `ls -la data/vector_db.json`
4. Check API health: `curl http://localhost:5000/api/health`
5. Check logs: Backend console in terminal

---

**Last Updated**: February 2026  
**Version**: 1.0.0 (Vector-Enhanced Prototype)
