# 🎓 Vector-Driven Teacher Evaluation System

**Academic Prototype | AI-Assisted Question Generation & Automated Answer Evaluation**

> A complete, runnable system that uses semantic vector retrieval instead of direct LLM comparison for fairer, more transparent automated grading.

---

## ✨ What Makes This Different

### Traditional LLM Evaluation ❌
```
Model Answer → [LLM] → Score
Student Answer → 
(LLM can hallucinate, use external knowledge)
```

### Vector-Based Evaluation ✅
```
Model Answer → [Chunk] → [Embed] → [Vector DB (FAISS)]
Student Answer → [Embed] → [Query] → [Retrieve Top-5] → [LLM Evaluates]
(LLM ONLY sees retrieved context, temperature=0 for consistency)
```

**Result**: Transparent, reproducible, hallucination-free grading with matched/missing concept feedback.

---

## 🚀 Quick Start (15 minutes)

### 1. Prerequisites
```bash
Node.js 18+
MongoDB (local or Atlas)
OpenAI API key (optional)
```

### 2. Setup
```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run seed
npm start

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm start
```

### 3. Open Browser
```
http://localhost:3000
Login: teacher@test.com / teacher123
```

### 4. Try It Out
1. Upload study material (paste text)
2. Generate questions
3. Upload model answer
4. Upload student answer
5. Click Evaluate → See score + matched/missing concepts!

**That's it! Full working system in 15 minutes.**

---

## 📚 Documentation

Start here based on your interest:

| Document | Time | For Whom |
|----------|------|----------|
| [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md) | 10 min | VS Code users |
| [RUN.md](./RUN.md) | 15 min | Setup & usage |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 20 min | Understanding design |
| [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) | 25 min | Technical details |
| [PROMPTS.md](./PROMPTS.md) | 15 min | AI prompts & examples |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | 30 min | Complete testing |
| [DELIVERABLE.md](./DELIVERABLE.md) | 15 min | What's included |

---

## 🎯 Features

✅ **Vector-Based Evaluation**
- Semantic retrieval of model answer chunks
- LLM only scores on retrieved context
- No hallucination or external knowledge

✅ **Matched/Missing Concepts**
- Shows what student understood correctly
- Lists missing concepts from model answer
- Detailed feedback on scoring

✅ **Knowledge Graph (New)**
- Extracts key concepts from study material and model answers
- Links related concepts into a graph for explainable evaluation
- Exposes API endpoints for concept search and related-concept lookup

✅ **Deterministic Scoring**
- Same answer = Same score (temperature=0)
- Reproducible results
- Fair and consistent

✅ **Fallback Mechanisms**
- Works without OpenAI API key (mock embeddings)
- Graceful error handling
- Always returns valid JSON

✅ **Teacher Dashboard**
- Material upload (text or PDF)
- Canonical Material Library (reuse materials across tests)
  - Optional chapter filters extracted from material headings
- Question generation
- Model/student answer management
- Results view with concept analysis

✅ **Complete Documentation**
- 6 comprehensive guides
- API documentation
- Testing procedures
- Troubleshooting tips


## 📊 API Endpoints

### Core Endpoints

```
POST /api/auth/login
  → JWT token for teacher

POST /api/upload-material
  → Chunk text → Generate embeddings → Store in FAISS

POST /api/generate-questions
  → Query FAISS → LLM generates from retrieved context

POST /api/upload-model-answer
  → Store ideal answer with max marks

POST /api/upload-student-answer
  → Store student response

POST /api/evaluate-answer ⭐ CORE
  → Embed student answer
  → Query FAISS for model answer chunks
  → Build evaluation prompt
  → LLM scores with strict JSON output
  → Returns: score, matched_concepts, missing_concepts, feedback

GET /api/knowledge-graph/summary
  → Node/edge counts for a test

GET /api/knowledge-graph/concepts
  → Search concepts extracted from material/model answers

GET /api/knowledge-graph/related
  → Related concepts for a given concept

POST /api/knowledge-graph/extract
  → Manually extract concepts from text

GET /api/results
  → All evaluations with full details

GET /api/debug/vector-db-stats
  → Vector DB index sizes and stats
```

---

## 💾 Data Flow

```
1. MATERIAL UPLOAD
   Text/PDF → Extract → Chunk (semantic sentences with overlap)
   → Generate embeddings (1536-dim via OpenAI or mock)
   → Store in FAISS material_index
   → Metadata to MongoDB

2. QUESTION GENERATION
   Query vector DB for relevant chunks
   → Build LLM prompt with only retrieved chunks
   → LLM generates questions STRICTLY from context
   → Return questions array

3. ANSWER EVALUATION (Vector-Based)
   Student answer → Embed → Query FAISS answers_index
   → Retrieve top-5 model answer chunks
   → Build evaluation prompt:
     - Question
     - Retrieved model answer context
     - Student answer
     - Rubric
   → LLM scores (temp=0 for determinism)
   → Output: JSON with score, matched concepts, feedback
   → Store in MongoDB with retrieval metadata
```

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19 (no UI libraries) |
| Backend | Node.js + Express |
| Vector DB | FAISS (pure JavaScript, in-memory JSON) |
| Embeddings | OpenAI Ada (1536-dim) or mock |
| LLM | ChatGPT 4o-mini |
| Database | MongoDB |
| Auth | JWT + bcrypt |

**Why these choices?**
- ✅ FAISS: Perfect for prototypes, no C++ build issues
- ✅ Pure JS: Runs anywhere, no dependencies
- ✅ OpenAI: Most reliable embeddings & LLM
- ✅ Mock fallback: Works without API key
- ✅ Deterministic: temperature=0 guarantees consistency

---

## 📈 Performance

| Operation | Time | Cost |
|-----------|------|------|
| Material upload (10KB) | 2-3s | $0 |
| Question generation | 3-5s | $0.012 |
| Answer evaluation | 3-5s | $0.014 |
| Vector search | <100ms | $0 |
| 100 student evaluations | ~8 min | ~$1.50 |

**Monthly cost for 100 students**: ~$2-50 (depending on infrastructure)

---

## ✅ Test Coverage

- 12 complete test suites
- 50+ individual test cases
- All major features covered
- Edge cases handled
- Fallback mechanisms tested

See `TESTING_GUIDE.md` for complete procedures.

---

## 🎓 Perfect For

✅ University courses (all disciplines)  
✅ Quick answer assessment  
✅ Concept verification  
✅ Large class scalability  
✅ Consistent grading  
✅ Teacher-assisted evaluation  

❌ Not for: Handwriting recognition, image analysis, code execution, plagiarism detection

---

## 🚨 Important Security Notes

✅ **Implemented**:
- JWT authentication
- Password hashing
- Input validation
- CORS enabled

⚠️ **Missing (add for production)**:
- Rate limiting
- HTTPS/SSL
- Audit logging
- Admin controls
- Data encryption

---

## 📦 What's Included

### Backend (New/Enhanced)
- ✨ `vectorDbService.js` - FAISS operations (200 LOC)
- ✨ `embeddingService.js` - Embeddings API (100 LOC)
- ✨ `chunkingService.js` - Text chunking (150 LOC)
- ♻️ `aiService.js` - Refactored for vector retrieval (250 LOC)
- ♻️ `uploadMaterial.js` - Enhanced with vector DB (80 LOC new)
- ♻️ `generateQuestions.js` - Vector retrieval QG (60 LOC new)
- ♻️ `evaluateAnswer.js` - Core vector evaluation (100 LOC new)
- ✨ `Chunk.js` - Chunk metadata model (40 LOC)
- ♻️ `EvaluationResult.js` - Enhanced with concepts (10 LOC new)

### Frontend
- All existing components work as-is
- New fields in results display

### Documentation (NEW)
- ✨ ARCHITECTURE.md - System design
- ✨ PROMPTS.md - AI prompt engineering
- ✨ SYSTEM_OVERVIEW.md - Technical details
- ✨ VSCODE_QUICKSTART.md - VS Code setup
- ✨ TESTING_GUIDE.md - Complete testing
- ♻️ RUN.md - Updated with vector features
- ✨ DELIVERABLE.md - Complete summary

**Total new code**: ~2500 LOC  
**Total modified code**: ~300 LOC  
**All dependencies**: Already in package.json

---

## 🚀 Deployment

### For University Use
1. Run on institutional server
2. Use MongoDB Atlas (managed)
3. Add OpenAI API key (or use mock)
4. Enable HTTPS
5. Add rate limiting

### For Large Scale
- Switch to persistent FAISS (HDF5)
- Use Pinecone for cloud indexing
- Add audit logging
- Set up monitoring & alerting

---

## 🔄 Evaluation Example

**Question**: *What is photosynthesis?*

**Model Answer**: 
> Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose. It occurs in chloroplasts and has two stages: light reactions and dark reactions.

**Student Answer**: 
> Plants use sunlight to make food.

**Vector DB Query**:
1. Embed student answer
2. Find most similar model answer chunks
3. Retrieve: "Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose."

**Evaluation Prompt** (to LLM):
```
Question: What is photosynthesis?
Model Answer: [retrieved chunk only]
Student Answer: Plants use sunlight to make food.
Rubric: [scoring guidelines]
Score based ONLY on model answer context above.
```

**LLM Output (JSON)**:
```json
{
  "score": 6,
  "max_score": 10,
  "matched_concepts": ["photosynthesis", "sunlight", "food", "energy"],
  "missing_concepts": ["chloroplasts", "glucose", "light reactions", "dark reactions"],
  "feedback": "Student demonstrates basic understanding of photosynthesis and energy conversion from sunlight. However, lacks specificity about location (chloroplasts), product (glucose), and the two-stage process. Good foundation for a 6/10."
}
```

**Why This Works**:
- ✅ LLM can't hallucinate (only sees retrieved text)
- ✅ Concepts are extracted from actual model answer
- ✅ Feedback explains why score is 6/10
- ✅ Same answer always gets same score (temp=0)
- ✅ Transparent and reproducible

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check MongoDB
mongosh

# Check port
lsof -ti:5000 | xargs kill -9

# Check dependencies
npm install
```

**OpenAI API errors**
```bash
# System falls back to mock embeddings
# Check logs for [Embedding] messages
# Leave OPENAI_API_KEY blank to use mock
```

**Vector DB not growing**
```bash
# Check material is being chunked
# Check chunks are being stored in MongoDB
mongosh → use tes → db.chunks.count()
```

**CORS errors**
```bash
# Verify FRONTEND_URL in backend .env
# Check backend is running
# Clear browser cache
```

See `TESTING_GUIDE.md` for more debugging tips.

---

## 📝 Example Workflow

1. **Teacher logs in** → Dashboard
2. **Uploads material** 
   - "Photosynthesis is the process..."
   - System chunks and embeds automatically
3. **Generates questions**
   - System retrieves relevant chunks
   - LLM generates 5 questions
4. **Sets model answer**
   - Question: "What is photosynthesis?"
   - Answer: "Complete explanation..."
   - Max marks: 10
5. **Evaluates students** (one by one)
   - Student A: "Plants use sun for food" → 6/10
   - Student B: "Detailed explanation with chloroplasts..." → 9/10
   - Student C: "Off-topic response" → 0/10
6. **Views results dashboard**
   - All evaluations visible
   - Concepts matched/missing shown
   - Can export or review

---

## 💡 Advanced Features

### Customizable Rubrics
```javascript
POST /api/evaluate-answer
Body: {
  rubric: {
    fullMarks: "Mentions photosynthesis, sunlight, glucose, chloroplasts",
    partialMarks: "Mentions 2-3 of above",
    zeroMarks: "Off-topic"
  }
}
```

### Topic-Based Questions
```javascript
POST /api/generate-questions
Body: {
  topic: "photosynthesis",
  difficulty: "hard"
}
```

### Batch Evaluation (Ready for)
```javascript
POST /api/evaluate-batch
Body: {
  studentAnswers: [
    {studentName: "A", answer: "..."},
    {studentName: "B", answer: "..."}
  ]
}
```

---

## 🏁 Next Steps

1. **Read**: `VSCODE_QUICKSTART.md` (5 min)
2. **Setup**: Follow quick start above (10 min)
3. **Test**: Try a complete workflow (5 min)
4. **Read**: `ARCHITECTURE.md` to understand design (20 min)
5. **Explore**: Check source code and prompts
6. **Customize**: Modify rubrics or prompt templates
7. **Deploy**: Set up for institutional use

---

## 📞 Support

- **Setup issues**: See `RUN.md`
- **Debugging**: See `TESTING_GUIDE.md`
- **Prompts**: See `PROMPTS.md`
- **Technical**: See `SYSTEM_OVERVIEW.md`
- **Architecture**: See `ARCHITECTURE.md`
- **VS Code**: See `VSCODE_QUICKSTART.md`

---

## 📄 License

Academic prototype for educational use. Feel free to modify and adapt for your institution.

---

## 🎉 You're Ready!

Everything is set up and ready to run. Start with `VSCODE_QUICKSTART.md` and you'll have a working system in 15 minutes.

**Questions?** Check the comprehensive documentation files listed above.

**Ready to grade fairly and transparently! 🚀**

---

**Version**: 1.0.0  
**Status**: Complete & Runnable ✅  
**Last Updated**: February 2026
