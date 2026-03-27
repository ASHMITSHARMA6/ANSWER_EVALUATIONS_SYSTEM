# Vector-Driven Academic Evaluation System

## High-Level Architecture

### Core Principle: Semantic Retrieval + Controlled Evaluation
**Unlike raw LLM comparison, this system:**
1. **Chunks** study material and model answers
2. **Embeds** chunks into vector space
3. **Stores** vectors in a local vector DB (FAISS)
4. **Retrieves** top-k relevant chunks for each student answer
5. **Passes** ONLY retrieved context + student answer to LLM
6. **Ensures** LLM cannot hallucinate or use external knowledge

---

## System Workflow

### 1. **Material Upload & Processing**
```
Teacher uploads study material (text)
    ↓
Backend chunks text (sentence-level, sliding window)
    ↓
Generate embeddings via OpenAI API (or mock)
    ↓
Store vectors in FAISS index
Store metadata (chunk text, source) in MongoDB
```

### 2. **Question Generation** (Vector-Assisted)
```
Teacher requests questions on a topic
    ↓
Query vector DB: "retrieve chunks about [topic]"
    ↓
Build prompt with retrieved chunks
    ↓
LLM generates questions ONLY from retrieved context
    ↓
Return questions to teacher
```

### 3. **Answer Evaluation** (STRICT Semantic)
```
Student submits answer to a question
    ↓
Embed student answer
    ↓
Query vector DB: retrieve top-5 model answer chunks
    ↓
Build evaluation prompt:
   - Question
   - Retrieved model-answer context
   - Student answer
   - Max marks + rubric
    ↓
LLM outputs STRICT JSON score + feedback
    ↓
Store result in MongoDB
```

---

## Tech Stack Details

### Frontend: React (No UI Libraries)
- **Pages:**
  - Login (email/password)
  - Dashboard (navigation hub)
  - Upload Material
  - Generate Questions
  - Upload Model Answers
  - Evaluate Student Answers
  - Results View

### Backend: Node.js + Express
- **Vector DB Service:** `vectorDbService.js`
  - FAISS for local in-memory storage
  - Mock Pinecone integration (ready for cloud)
  - Methods: `addEmbeddings()`, `query()`, `deleteIndex()`
  
- **Embedding Service:** `embeddingService.js`
  - OpenAI Embeddings API (Ada model)
  - Mock embeddings (deterministic hashing) when key unavailable
  
- **Chunking Service:** `chunkingService.js`
  - Sentence-based chunking with overlap
  - Preserves semantic boundaries

- **AI Service (Refactored):** `aiService.js`
  - Question generation with retrieval
  - Answer evaluation with strict JSON output
  - Temperature=0 for deterministic results

### Database: MongoDB
- **Collections:**
  - `users` - teacher accounts
  - `studyMaterials` - metadata only
  - `chunks` - chunk metadata + source reference
  - `modelAnswers` - ideal answers + marks
  - `evaluationResults` - LLM scores + feedback

### Vector DB: FAISS (Local) + Optional Pinecone
- **Index:** `study_material_index` (text embeddings)
- **Index:** `model_answers_index` (answer embeddings)
- **Storage:** In-memory (demo) or persistent binary file

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     TEACHER ACTIONS                         │
└─────────────────────────────────────────────────────────────┘
         │
         ├─→ Upload Study Material
         │    └─→ API: POST /api/upload-material
         │         ├─ Chunk text
         │         ├─ Generate embeddings
         │         ├─ Store in FAISS
         │         └─ Store metadata in MongoDB
         │
         ├─→ Generate Questions
         │    └─→ API: POST /api/generate-questions
         │         ├─ Retrieve chunks from FAISS
         │         ├─ Call LLM with context
         │         └─ Return questions
         │
         ├─→ Upload Model Answers
         │    └─→ API: POST /api/upload-model-answer
         │         ├─ Embed model answer
         │         ├─ Store in model_answers_index
         │         └─ Store in MongoDB
         │
         ├─→ Evaluate Student Answers
         │    └─→ API: POST /api/evaluate-answer
         │         ├─ Embed student answer
         │         ├─ Retrieve top-5 from model_answers_index
         │         ├─ Build evaluation prompt
         │         ├─ Call LLM (temp=0, strict JSON)
         │         └─ Parse & store result
         │
         └─→ View Results
              └─→ API: GET /api/results
                   └─ Fetch all evaluations from MongoDB
```

---

## Evaluation Prompt Structure

### System Prompt (Strict)
```
You are an AI grader. Evaluate student answers STRICTLY based on:
1. The specific question
2. The retrieved model answer context (this is the ONLY reference material)
3. The marks rubric provided

DO NOT use external knowledge. Score ONLY on retrieved context.
Output STRICT JSON. No explanations. No markdown.
```

### User Prompt (Example)
```json
{
  "question": "What is photosynthesis?",
  "model_answer_context": "Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose. It occurs in chloroplasts...",
  "student_answer": "Plants use sunlight to make food.",
  "max_score": 10,
  "rubric": {
    "full_marks": "Mentions photosynthesis, sunlight, energy/food, chloroplasts",
    "half_marks": "Mentions 2-3 of the above",
    "zero_marks": "Vague or off-topic"
  }
}
```

### Expected JSON Output
```json
{
  "score": 6,
  "max_score": 10,
  "matched_concepts": ["photosynthesis", "sunlight", "food"],
  "missing_concepts": ["chloroplasts", "glucose", "chemical energy"],
  "feedback": "Student understands basic concept but lacks depth. Photosynthesis correctly identified with energy conversion mentioned. Missing location (chloroplasts) and energy form (glucose/chemical)."
}
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` → JWT token
- `POST /api/auth/register` → Teacher account

### Material Management
- `POST /api/upload-material` → Process & embed text
- `GET /api/materials` → List uploaded materials

### Question Generation
- `POST /api/generate-questions` → Retrieve + LLM generate

### Answer Management
- `POST /api/upload-model-answer` → Embed & store ideal answer
- `GET /api/model-answers` → List model answers

- `POST /api/upload-student-answer` → Store student submission
- `GET /api/student-answers` → List submissions

### Evaluation
- `POST /api/evaluate-answer` → Core: embed, retrieve, score

### Results
- `GET /api/results` → All evaluation results
- `GET /api/results/:id` → Single evaluation

---

## Vector DB Index Structure

### Index 1: `study_material_index`
```
Vector: 1536-dim (OpenAI Ada)
Metadata:
  - chunk_text: str (actual text)
  - source: str (material ID)
  - section: str (optional)
```

### Index 2: `model_answers_index`
```
Vector: 1536-dim (OpenAI Ada)
Metadata:
  - answer_text: str
  - question: str
  - max_score: int
  - question_id: str
```

---

## Security & Constraints

✅ **What LLM CANNOT do:**
- Use external knowledge
- Hallucinate facts not in retrieved context
- Access student previous answers
- Modify grades after creation

✅ **What LLM CAN do:**
- Score based on retrieved context
- Provide structured feedback
- Flag partial understanding

---

## Deployment Notes

### Local Development (Current)
- FAISS: In-memory JSON index
- Embeddings: OpenAI API (mock fallback)
- Ideal for prototyping

### Production-Ready (Future)
- FAISS: Persistent binary file or HDF5
- Pinecone: Cloud vector DB (code-ready)
- Multiple indices per teacher (isolation)

---

## Files Overview

```
backend/
├── src/
│   ├── services/
│   │   ├── vectorDbService.js      ← FAISS operations
│   │   ├── embeddingService.js     ← OpenAI embeddings
│   │   ├── chunkingService.js      ← Text chunking
│   │   └── aiService.js            ← (Refactored) Question + Evaluation
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── StudyMaterial.js
│   │   ├── Chunk.js                ← (NEW) Chunk metadata
│   │   ├── ModelAnswer.js
│   │   ├── StudentAnswer.js
│   │   ├── EvaluationResult.js
│   │   └── QuestionSet.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── uploadMaterial.js
│   │   ├── generateQuestions.js
│   │   ├── uploadModelAnswer.js
│   │   ├── uploadStudentAnswer.js
│   │   ├── evaluateAnswer.js
│   │   └── results.js
│   │
│   └── index.js
│
└── .env.example

frontend/
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── UploadMaterial.js
│   │   ├── GenerateQuestions.js    ← (NEW)
│   │   ├── UploadModelAnswer.js    ← (REFACTORED)
│   │   ├── EvaluateAnswer.js       ← (REFACTORED)
│   │   ├── ResultsView.js
│   │   └── Navbar.js
│   │
│   └── App.js
└── .env.example
```

---

## Next Steps to Run

1. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure .env:**
   - Backend: `OPENAI_API_KEY`, `MONGODB_URI`, `JWT_SECRET`
   - Frontend: `REACT_APP_API_BASE_URL`

3. **Start services:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm start
   
   # Terminal 2: Frontend
   cd frontend && npm start
   ```

4. **Seed teacher:**
   ```bash
   npm run seed
   ```

5. **Open browser:**
   ```
   http://localhost:3000
   ```

---

## Evaluation Quality Metrics

### What This System Ensures
- ✅ No hallucination (only retrieved context used)
- ✅ Semantic matching (vector similarity)
- ✅ Partial credit support (rubric-based)
- ✅ Deterministic scoring (temperature=0)
- ✅ Transparent feedback (why score given)

### Limitations (Academic Prototype)
- Chunking strategy affects retrieval quality
- Embedding model (Ada) ~$0.02/10k queries
- No support for images/diagrams
- Single-turn evaluation (no follow-up questions)
