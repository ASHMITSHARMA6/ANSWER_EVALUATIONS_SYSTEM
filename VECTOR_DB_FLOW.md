# 🎯 VECTOR DATABASE - Step-by-Step Visual Guide

## The Complete Flow in Your Project

### PHASE 1: Upload Study Material

```
Teacher uploads: "Photosynthesis material"
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Upload Material                                     │
│ POST /api/upload-material                                   │
│ Body: { text: "Photosynthesis happens in two stages..." }   │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Chunk Text                                          │
│ File: chunkingService.js                                    │
│                                                              │
│ Input: "Photosynthesis happens in chloroplasts. Light       │
│         reactions produce ATP. Dark reactions produce       │
│         glucose."                                           │
│                                                              │
│ Process:                                                    │
│  ├─ Split on sentences                                     │
│  ├─ Group into 4-sentence chunks                           │
│  ├─ Keep 1-sentence overlap                                │
│  └─ Filter < 30 chars                                      │
│                                                              │
│ Output:                                                     │
│  ├─ Chunk 1: "Photosynthesis happens in chloroplasts..."   │
│  ├─ Chunk 2: "Light reactions produce ATP. Dark..."        │
│  └─ Chunk 3: "...reactions produce glucose."               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Generate Embeddings                                 │
│ File: embeddingService.js                                   │
│                                                              │
│ For each chunk:                                             │
│   Chunk 1: "Photosynthesis..."                              │
│        ↓                                                     │
│   OpenAI API (text-embedding-3-small)                       │
│        ↓                                                     │
│   1536-dimensional vector:                                  │
│   [0.234, -0.891, 0.102, 0.445, ..., 0.567]               │
│                                                              │
│   Chunk 2: "Light reactions..."                             │
│        ↓                                                     │
│   [0.245, -0.878, 0.115, 0.430, ..., 0.590]               │
│                                                              │
│   Chunk 3: "...reactions produce glucose."                  │
│        ↓                                                     │
│   [0.267, -0.901, 0.098, 0.398, ..., 0.601]               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Store in Vector DB                                  │
│ File: vectorDbService.js                                    │
│                                                              │
│ indices.material (In-Memory FAISS)                          │
│ ┌────────────────────────────────────────────────┐         │
│ │ vectors array:                                 │         │
│ │ [                                              │         │
│ │   [0.234, -0.891, 0.102, ..., 0.567],        │         │
│ │   [0.245, -0.878, 0.115, ..., 0.590],        │         │
│ │   [0.267, -0.901, 0.098, ..., 0.601]         │         │
│ │ ]                                              │         │
│ │                                                │         │
│ │ metadata array:                                │         │
│ │ [                                              │         │
│ │   {text: "Photosynthesis...", source: "mat1"} │         │
│ │   {text: "Light reactions...", source: "mat1"}│         │
│ │   {text: "...glucose.", source: "mat1"}       │         │
│ │ ]                                              │         │
│ └────────────────────────────────────────────────┘         │
│                                                              │
│ Backup: Save to backend/data/vector_db.json                │
└─────────────────────────────────────────────────────────────┘
         ↓
✅ Material indexed and ready for questions!
```

---

### PHASE 2: Upload Model Answer

```
Teacher uploads: "Ideal answer"
         ↓
┌─────────────────────────────────────────────────────────────┐
│ POST /api/upload-model-answer                               │
│ Body: {                                                     │
│   question: "Explain photosynthesis stages",                │
│   answer: "Light reactions produce ATP and NADPH in..."     │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
         ↓
(SAME PROCESS AS ABOVE)
  1. Chunk model answer
  2. Generate embeddings for each chunk
  3. Store in indices.answers (separate Vector DB)
         ↓
✅ Model answer indexed and ready for evaluation!
```

---

### PHASE 3: Batch Evaluate Student Answers

```
Teacher uploads: Folder with 3 student answers
         ↓
POST /api/batch-upload-answers
  Files: [student1.pdf, student2.txt, student3.pdf]
         ↓
┌────────────────────────────────────────────────────────────────┐
│ FOR EACH FILE (Sequential Processing)                         │
└────────────────────────────────────────────────────────────────┘
         ↓
         ↓ FILE 1: student1.pdf
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 1A: Extract Text from PDF                              │
│                                                              │
│ PDF file → PDF parser → Raw text                            │
│                                                              │
│ Output: "Photosynthesis happens in chloroplasts where       │
│         light reactions convert light to ATP..."            │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2A: Generate Single Embedding (Not Chunks!)            │
│                                                              │
│ Full student answer → OpenAI API → 1536-dim vector          │
│                                                              │
│ Student embedding: [0.232, -0.895, 0.105, ..., 0.445]      │
│                                                              │
│ Note: We embed WHOLE answer, not chunks                     │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3A: Query Vector DB (The Magic!)                       │
│                                                              │
│ Question: "Which stored model chunks are most similar       │
│            to this student answer?"                         │
│                                                              │
│ Query vector: [0.232, -0.895, 0.105, ..., 0.445]           │
│        ↓                                                     │
│ Compare with ALL stored model chunks using COSINE SIMILARITY │
│        ↓                                                     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Similarity Scores:                                   │   │
│ │                                                      │   │
│ │ Model Chunk 1 "Photosynthesis..."  → Score: 0.92 ✓✓ │   │
│ │ Model Chunk 2 "Light reactions..." → Score: 0.75  ✓ │   │
│ │ Model Chunk 3 "...reactions..."    → Score: 0.68    │   │
│ │                                                      │   │
│ │ (Only showing chunks >0.6 for clarity)              │   │
│ └──────────────────────────────────────────────────────┘   │
│        ↓                                                    │
│ Return TOP-5 CHUNKS:                                       │
│ [                                                          │
│   {text: "Photosynthesis...", score: 0.92},              │   │
│   {text: "Light reactions...", score: 0.75},             │   │
│   {text: "...reactions...", score: 0.68},                │   │
│   ...                                                      │   │
│ ]                                                          │   │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4A: LLM Evaluation (Temperature=0)                     │
│                                                              │
│ Prepare prompt:                                             │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ SYSTEM PROMPT:                                       │   │
│ │ "You are an exam grader. Score based ONLY on the     │   │
│ │  provided model answer chunks. Do NOT use external   │   │
│ │  knowledge. Do NOT hallucinate."                     │   │
│ │                                                      │   │
│ │ USER PROMPT:                                         │   │
│ │ "Question: Explain photosynthesis stages             │   │
│ │  Model (for reference):                              │   │
│ │  - 'Photosynthesis...'                               │   │
│ │  - 'Light reactions...'                              │   │
│ │  - '...reactions...'                                 │   │
│ │                                                      │   │
│ │  Student Answer: 'Photosynthesis happens in...'      │   │
│ │                                                      │   │
│ │  Score this on 0-100 scale. Return JSON:             │   │
│ │  {                                                   │   │
│ │    'score': number,                                  │   │
│ │    'matchedConcepts': ['concept1', 'concept2'],      │   │
│ │    'missingConcepts': ['concept3'],                  │   │
│ │    'feedback': 'explanation'                         │   │
│ │  }"                                                  │   │
│ └──────────────────────────────────────────────────────┘   │
│        ↓                                                    │
│ Call OpenAI API (gpt-4o-mini, temperature=0)               │
│        ↓                                                    │
│ LLM Response:                                               │
│ {                                                           │
│   "score": 85,                                              │
│   "matchedConcepts": [                                      │
│     "photosynthesis in chloroplasts",                       │
│     "light reactions convert light"                         │
│   ],                                                        │
│   "missingConcepts": [                                      │
│     "ATP production",                                       │
│     "dark reactions"                                        │
│   ],                                                        │
│   "feedback": "Good understanding of location and light     │
│               reactions, but missing energy product details"│
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5A: Save Result to Database                            │
│                                                              │
│ MongoDB - EvaluationResult collection:                      │
│ {                                                           │
│   _id: ObjectId(...),                                       │
│   userId: "teacher123",                                     │
│   studentName: "student1",                                  │
│   questionText: "Explain photosynthesis stages",             │
│   studentAnswer: "Photosynthesis happens...",               │
│   marks: 85,                                                │
│   maxMarks: 100,                                            │
│   matchedConcepts: [...],                                   │
│   missingConcepts: [...],                                   │
│   feedback: "Good understanding...",                        │
│   evaluationMethod: "vector_retrieval_llm",                 │
│   createdAt: 2026-02-03T...                                 │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
         ↓
✅ FILE 1 COMPLETE: student1 gets 85/100
Progress: 1/3
         ↓
         ↓ FILE 2: student2.txt
         ↓
(REPEAT STEPS 1A-5A FOR FILE 2)
  Extract → Embed → Query Vector DB → LLM → Save
✅ FILE 2 COMPLETE: student2 gets 72/100
Progress: 2/3
         ↓
         ↓ FILE 3: student3.pdf
         ↓
(REPEAT STEPS 1A-5A FOR FILE 3)
  Extract → Embed → Query Vector DB → LLM → Save
✅ FILE 3 COMPLETE: student3 gets 91/100
Progress: 3/3
         ↓
┌────────────────────────────────────────────────────────────┐
│ AGGREGATE RESULTS                                          │
│                                                            │
│ Results: [                                                │
│   {                                                       │
│     filename: "student1.pdf",                             │
│     score: 85,                                            │
│     matchedConcepts: [...],                               │
│     missingConcepts: [...]                                │
│   },                                                      │
│   {                                                       │
│     filename: "student2.txt",                             │
│     score: 72,                                            │
│     matchedConcepts: [...],                               │
│     missingConcepts: [...]                                │
│   },                                                      │
│   {                                                       │
│     filename: "student3.pdf",                             │
│     score: 91,                                            │
│     matchedConcepts: [...],                               │
│     missingConcepts: [...]                                │
│   }                                                       │
│ ]                                                         │
│                                                            │
│ Summary: {                                                │
│   totalFiles: 3,                                          │
│   processedFiles: 3,                                      │
│   failedFiles: 0,                                         │
│   averageScore: 82.7,                                     │
│   highestScore: 91,                                       │
│   lowestScore: 72,                                        │
│   totalTime: 8.3                                          │
│ }                                                         │
└────────────────────────────────────────────────────────────┘
         ↓
✅ BATCH COMPLETE!
```

---

## Key Concepts Explained

### 1. **Cosine Similarity** (The Matching Algorithm)

```
Two vectors:
Vector A: [1.0, 0.5, 0.2]
Vector B: [0.9, 0.6, 0.1]

Step 1: Dot Product
A · B = (1.0 × 0.9) + (0.5 × 0.6) + (0.2 × 0.1)
      = 0.9 + 0.3 + 0.02 = 1.22

Step 2: Magnitudes
||A|| = √(1.0² + 0.5² + 0.2²) = √1.29 ≈ 1.136
||B|| = √(0.9² + 0.6² + 0.1²) = √1.18 ≈ 1.086

Step 3: Similarity
cos(θ) = A · B / (||A|| × ||B||)
       = 1.22 / (1.136 × 1.086)
       = 1.22 / 1.234
       ≈ 0.989 (Very similar!)

Scale:
  1.0   = Identical
  0.9+  = Very similar
  0.7   = Similar
  0.5   = Somewhat similar
  0.0   = Different
```

### 2. **Two Separate Indices**

```
indices.material
├─ Stores: Study material chunks
├─ Used for: Question generation
└─ Size: Grows with each uploaded material

indices.answers
├─ Stores: Model answer chunks
├─ Used for: Answer evaluation
└─ Size: Small (one model answer)
```

### 3. **Why Separate Indices?**

```
Query: Generate questions
Use: indices.material
Find: Relevant sections from study material
↓
Query: Evaluate student answer
Use: indices.answers
Find: Similar model answer chunks
```

---

## Configuration Options

### Change Vector Dimension

```javascript
// Default: 1536 (OpenAI embedding size)
new SimpleVectorIndex(dimension = 1536);

// Could use 768 or other sizes for different models
new SimpleVectorIndex(dimension = 768);
```

### Adjust Top-K Results

```javascript
// Default: topK = 5
vectorDbService.queryAnswers(embedding, topK = 5);

// Get more results
vectorDbService.queryAnswers(embedding, topK = 10);

// Get fewer results
vectorDbService.queryAnswers(embedding, topK = 3);
```

### Filter by Similarity Threshold

```javascript
const SIMILARITY_THRESHOLD = 0.7;

const results = vectorDbService.queryAnswers(embedding, 10);
const relevant = results.filter(r => r.score > SIMILARITY_THRESHOLD);
```

---

## File Organization

```
backend/
├── data/
│   └── vector_db.json          ← Persistent storage (auto-created)
│                                 {
│                                   "material": {...},
│                                   "answers": {...},
│                                   "timestamp": "2026-02-03T..."
│                                 }
│
├── src/
│   ├── services/
│   │   ├── vectorDbService.js  ← Vector DB operations
│   │   ├── embeddingService.js ← OpenAI embeddings
│   │   ├── chunkingService.js  ← Text → chunks
│   │   └── aiService.js        ← LLM prompts
│   │
│   ├── routes/
│   │   ├── uploadMaterial.js       → add to material index
│   │   ├── uploadModelAnswer.js    → add to answers index
│   │   ├── evaluateAnswer.js       → query answers index
│   │   └── batchUploadAnswers.js   → process multiple files
│   │
│   └── models/
│       ├── StudyMaterial.js  → Raw material text
│       ├── Chunk.js          → Chunk metadata
│       └── EvaluationResult.js → Scores + feedback
│
└── uploads/batch/             ← Temporary file storage
    └── (auto-created)
```

---

## Performance Characteristics

```
Operation          Time    Complexity  Notes
─────────────────────────────────────────────────────────
Generate embedding  0.3s   O(1)        Per text (API call)
Store vector       ~1ms   O(1)        Add to index
Search (top-5)     0.1s   O(n)        Compare with all
Calculate score    1.0s   O(1)        LLM call
─────────────────────────────────────────────────────────

Total per answer: ~2 seconds
100 answers: ~200 seconds (3.3 minutes)
```

---

## Troubleshooting

### Vector DB not persisting?
```
Check: backend/data/vector_db.json exists
Fix: Ensure backend has write permissions
Debug: Check console for "[VectorDB] Persisted to disk"
```

### Similarity scores always 0?
```
Cause: Vectors might be zero vectors
Fix: Check embeddingService generates non-zero vectors
Debug: Log vectors before storing
```

### Query returns too few results?
```
Cause: Not enough vectors stored
Fix: Upload more material first
Debug: Check getStats() endpoint
```

---

**That's Vector Database in your project! Questions?**
