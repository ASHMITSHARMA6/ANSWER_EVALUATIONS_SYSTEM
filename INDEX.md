# 📚 DOCUMENTATION INDEX

## Vector-Driven Teacher Evaluation System v1.0.0

**Choose your path below based on your role and time available:**

---

## ⚡ QUICK START (15 minutes)

**For**: Anyone who wants to run the system immediately

1. **Read**: [README.md](./README.md) - 5 minute overview
2. **Read**: [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md) - Terminal setup
3. **Run**: Commands in VS Code
4. **Test**: Complete a full workflow

**Result**: Running system evaluating answers

---

## 👨‍💻 FOR DEVELOPERS

**Path 1: I want to understand the code**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design & concepts
2. [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Detailed technical overview
3. **Explore source code**:
   - `backend/src/services/vectorDbService.js` - FAISS operations
   - `backend/src/services/embeddingService.js` - OpenAI integration
   - `backend/src/services/chunkingService.js` - Text processing
   - `backend/src/services/aiService.js` - LLM prompts

**Path 2: I want to modify prompts**
1. [PROMPTS.md](./PROMPTS.md) - All AI prompts with examples
2. Open `backend/src/services/aiService.js`
3. Modify `EVAL_SYSTEM` and `QUESTION_GEN_SYSTEM`
4. [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Test your changes

**Path 3: I want to integrate with my system**
1. [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - All API endpoints
2. Review `backend/src/routes/` - 7 main routes
3. Use REST client or curl to test endpoints
4. Adapt to your platform

---

## 🎓 FOR EDUCATORS/ADMINISTRATORS

**Path 1: I want to deploy this for my institution**
1. [README.md](./README.md) - Feature overview
2. [RUN.md](./RUN.md) - Complete setup guide
3. [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Deployment section
4. Contact IT for MongoDB & server setup

**Path 2: I want to understand how grading works**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - System workflow section
2. [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Evaluation flow diagram
3. [PROMPTS.md](./PROMPTS.md) - Examples of evaluation

**Path 3: I want to customize scoring rubrics**
1. [PROMPTS.md](./PROMPTS.md) - Rubric templates section
2. [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Test 7.4 (partial credit)
3. Modify rubrics in evaluation prompt

---

## 🧪 FOR QA/TESTERS

**Must Read**:
1. [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 12 test suites, 50+ test cases
2. [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common issues & solutions

**Test Scenarios**:
- Test Suite 1: System startup
- Test Suite 2: Authentication
- Test Suite 3: Material upload & vector DB
- Test Suite 4: Question generation
- Test Suite 5-6: Answer uploads
- Test Suite 7: Core evaluation (MOST IMPORTANT)
- Test Suite 8: Results persistence
- Test Suite 9: Fallback mechanisms
- Test Suite 10-12: Performance & integration

---

## 📖 DOCUMENTATION REFERENCE

### By Topic

**Getting Started**
- [README.md](./README.md) - Overview & quick start
- [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md) - VS Code setup

**Setup & Installation**
- [RUN.md](./RUN.md) - Complete setup guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common issues

**System Design**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - High-level design
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Detailed technical
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Flow diagrams

**AI & Evaluation**
- [PROMPTS.md](./PROMPTS.md) - Prompts with examples
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Evaluation flow

**Testing**
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 50+ test cases
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common issues

**Project Info**
- [DELIVERABLE.md](./DELIVERABLE.md) - What's included
- [COMPLETION_CHECKLIST.md](./COMPLETION_CHECKLIST.md) - Implementation status

---

### By Reading Time

**5 minutes**
- [README.md](./README.md) - Quick overview
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - 60-second summary

**10 minutes**
- [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md) - Quick setup

**15 minutes**
- [RUN.md](./RUN.md) - Full setup
- [PROMPTS.md](./PROMPTS.md) - Examples only
- [COMPLETION_CHECKLIST.md](./COMPLETION_CHECKLIST.md) - Summary

**20+ minutes**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Technical details
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - All test procedures
- [PROMPTS.md](./PROMPTS.md) - Full guide with customization

---

## 🎯 FIND WHAT YOU NEED

**"How do I...?"**

| Question | Answer |
|----------|--------|
| ...run the system? | [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md) or [RUN.md](./RUN.md) |
| ...understand the architecture? | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| ...modify the AI prompts? | [PROMPTS.md](./PROMPTS.md) |
| ...test the system? | [TESTING_GUIDE.md](./TESTING_GUIDE.md) |
| ...fix common errors? | [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) or [RUN.md](./RUN.md) |
| ...integrate it with my system? | [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) |
| ...deploy to production? | [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) |
| ...understand what's new? | [DELIVERABLE.md](./DELIVERABLE.md) |
| ...see all code changes? | [COMPLETION_CHECKLIST.md](./COMPLETION_CHECKLIST.md) |
| ...find API endpoints? | [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) or [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) |
| ...understand evaluation logic? | [PROMPTS.md](./PROMPTS.md) or [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) |
| ...trace data flow? | [ARCHITECTURE.md](./ARCHITECTURE.md) or [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) |

---

## 📂 FILE LOCATIONS

### Core Backend Services (NEW)
```
backend/src/services/
├── vectorDbService.js     ← FAISS vector DB (read: ARCHITECTURE.md)
├── embeddingService.js    ← Embeddings (read: SYSTEM_OVERVIEW.md)
├── chunkingService.js     ← Text chunking (read: SYSTEM_OVERVIEW.md)
└── aiService.js           ← LLM prompts (read: PROMPTS.md)
```

### Routes (ENHANCED)
```
backend/src/routes/
├── uploadMaterial.js      ← Read: RUN.md
├── generateQuestions.js   ← Read: ARCHITECTURE.md
├── evaluateAnswer.js      ← Read: PROMPTS.md
└── ...others             ← Read: SYSTEM_OVERVIEW.md
```

### Configuration
```
backend/.env.example      ← Read: RUN.md
frontend/.env.example     ← Read: RUN.md
```

---

## 🔍 DETAILED CONTENTS

### README.md
- What is this system
- Quick start (15 min)
- Feature overview
- Architecture diagram
- Example workflow

### VSCODE_QUICKSTART.md
- Terminal setup (4 terminals)
- Quick testing
- File navigation
- Debug mode

### RUN.md
- Complete setup
- Step-by-step workflow
- API endpoints
- Troubleshooting
- Production notes

### ARCHITECTURE.md
- High-level design
- Data flow diagrams
- Vector DB structure
- Workflow explanation
- Security constraints

### SYSTEM_OVERVIEW.md
- Executive summary
- Services documentation
- Complete API reference
- Data models (7 models)
- Performance metrics
- Deployment guide

### PROMPTS.md
- Question generation prompt
- Answer evaluation prompt (STRICT)
- Example inputs/outputs
- Rubric templates
- Prompt engineering tips
- Troubleshooting

### TESTING_GUIDE.md
- 12 test suites
- 50+ test cases
- Debugging tips
- Success criteria

### QUICK_REFERENCE.md
- 60-second overview
- File locations
- Setup in 3 steps
- Flow diagrams
- API quick reference
- Common issues
- Performance profile

### DELIVERABLE.md
- What's included
- Code statistics
- How to run
- Documentation hierarchy
- Feature checklist
- Production roadmap

### COMPLETION_CHECKLIST.md
- Implementation status
- All files created/modified
- Features implemented
- Quality metrics
- Success criteria

---

## 🚀 RECOMMENDED READING ORDER

**For Everyone**:
1. [README.md](./README.md) (5 min) - Understand what this is
2. [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md) (10 min) - Get it running

**Then, choose by role:**

**Developers**:
→ [ARCHITECTURE.md](./ARCHITECTURE.md) (20 min)  
→ [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) (25 min)  
→ [PROMPTS.md](./PROMPTS.md) (15 min)  

**Educators**:
→ [RUN.md](./RUN.md) (15 min)  
→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (10 min)  
→ [PROMPTS.md](./PROMPTS.md) - Rubrics section (10 min)  

**QA/Testers**:
→ [TESTING_GUIDE.md](./TESTING_GUIDE.md) (30 min)  
→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Issues section (10 min)  

**Administrators**:
→ [RUN.md](./RUN.md) (15 min)  
→ [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Deployment section (15 min)  
→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (10 min)  

---

## 📞 GETTING HELP

1. **"Where do I start?"**  
   → [README.md](./README.md)

2. **"How do I set this up?"**  
   → [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md) + [RUN.md](./RUN.md)

3. **"Why isn't something working?"**  
   → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common Issues section

4. **"How does the vector DB work?"**  
   → [ARCHITECTURE.md](./ARCHITECTURE.md)

5. **"How do I customize prompts?"**  
   → [PROMPTS.md](./PROMPTS.md)

6. **"What should I test?"**  
   → [TESTING_GUIDE.md](./TESTING_GUIDE.md)

7. **"What changed from the old system?"**  
   → [DELIVERABLE.md](./DELIVERABLE.md) or [COMPLETION_CHECKLIST.md](./COMPLETION_CHECKLIST.md)

8. **"Is it ready for production?"**  
   → [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) - Production section

---

## 📊 DOCUMENTATION STATISTICS

| Document | Type | Pages | Reading Time |
|----------|------|-------|--------------|
| README.md | Guide | 10 | 5 min |
| VSCODE_QUICKSTART.md | Guide | 8 | 10 min |
| RUN.md | Guide | 12 | 15 min |
| ARCHITECTURE.md | Reference | 15 | 20 min |
| SYSTEM_OVERVIEW.md | Reference | 20 | 25 min |
| PROMPTS.md | Guide | 18 | 15 min |
| TESTING_GUIDE.md | Reference | 20 | 30 min |
| QUICK_REFERENCE.md | Guide | 12 | 10 min |
| DELIVERABLE.md | Summary | 15 | 15 min |
| COMPLETION_CHECKLIST.md | Checklist | 10 | 10 min |
| **TOTAL** | **-** | **~140** | **~2 hours** |

---

## ✅ BEFORE YOU START

Make sure you have:
- [ ] Node.js 18+
- [ ] MongoDB (local or Atlas)
- [ ] Terminal access
- [ ] Text editor (VS Code recommended)
- [ ] 15 minutes for setup
- [ ] 5 minutes for first evaluation

---

## 🎯 NEXT STEPS

**Right now:**
1. Read [README.md](./README.md) (5 minutes)
2. Open [VSCODE_QUICKSTART.md](./VSCODE_QUICKSTART.md)

**In 10 minutes:**
3. Have system running
4. Logged in and on dashboard

**In 15 minutes:**
5. Complete first full workflow
6. See matched/missing concepts

**In 1 hour:**
7. Understand architecture
8. Know how to customize

**In 2 hours:**
9. Master all features
10. Ready to deploy

---

**Pick a document above and start reading! 📖**

**All docs are structured for quick navigation and reference.**

**You'll be evaluating answers fairly and transparently in 15 minutes! 🚀**