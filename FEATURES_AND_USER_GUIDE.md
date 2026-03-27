# 📘 TES Features & User Guide

This document is a complete, student‑friendly overview of all features and how to use them end‑to‑end.

---

## 1) What the system does
TES helps teachers:
- Upload study material (text/PDF/folder)
- Generate questions using retrieved context
- Upload model answers and student answers
- Evaluate answers with transparent, retrieval‑based scoring
- Reuse materials across tests with a canonical material library
- Filter question generation by detected chapters

---

## 2) Key Features (Complete List)

### ✅ Material Ingestion
- Upload text or PDF (single or folder)
- Automatic text extraction from PDF
- Chunking + embedding for retrieval
- Vector DB indexing for semantic search

### ✅ Canonical Material Library
- Dedupe by content hash
- Reuse the same material across multiple tests
- Explicit selection + reference action

### ✅ Chapter Extraction (Auto‑Detected)
- Chapters are extracted directly from material headings
- Multi‑select chapters to generate targeted questions
- Optional — skip chapter selection to use full material

### ✅ Question Generation
- Custom prompt (optional)
- Multi‑chapter targeting (optional)
- LLM generates questions + model answers

### ✅ Question Paper Upload (NEW)
- Upload a PDF or paste a full question paper
- AI extracts questions and generates model answers
- Saves model answers automatically for evaluation

### ✅ Model Answer & Student Answer Upload
- Separate storage for model and student answers
- Supports evaluation flow per test

### ✅ AI Evaluation
- Retrieval‑augmented evaluation
- Deterministic scoring (temperature=0)
- Outputs matched concepts, missing concepts, and feedback

### ✅ Results Dashboard
- View all past evaluations
- Clear explanation of scoring

---

## 3) Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend setup
```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm start
```

### Frontend setup
```bash
cd frontend
cp .env.example .env
npm install
npm start
```

### Open in browser
```bash
http://localhost:3000
```

Login:
```
teacher@test.com / teacher123
```

---

## 4) End‑to‑End Usage Flow

### Step 1: Select or create a test
- Go to **Dashboard**
- Choose a test environment (each test has its own material, answers, and results)

### Step 2: Upload study material
- Go to **Material**
- Paste text or upload PDF / folder
- System stores material, chunks text, embeds, and indexes it

### Step 3: Reference existing materials (optional)
- Go to **Material Library**
- Select a test
- Choose a canonical material (radio select)
- Click **Reference Selected Material**

### Step 4: Generate questions
- Go to **Questions**
- Choose question count
- Optional: add a custom prompt
- Optional: select one or more **detected chapters**
- Click **Generate Questions**

### Step 4b (Optional): Upload question paper
- Go to **Questions**
- Upload a PDF question paper **or** paste question text
- Click **Extract Questions + Generate Model Answers**
- Model answers are saved automatically

### Step 5: Upload model answers
- Go to **Model Answer**
- Upload ideal answers for generated questions

### Step 6: Upload student answers
- Go to **Student Answer**
- Paste student responses

### Step 7: Evaluate
- Go to **Evaluate**
- Click evaluate → results are stored

### Step 8: Review results
- Go to **Results**
- View scores, matched/missing concepts, feedback

---

## 5) Chapter Extraction Details

Chapters are detected by headings like:
- `Chapter 3: Normalization`
- `Unit 2 - Relational Algebra`
- `3 - SQL Queries`

You can multi‑select any detected chapters. If none are selected, the full material is used.

---

## 6) Material Library Workflow

- Uploading material automatically creates a canonical entry
- Canonical materials can be referenced into multiple tests
- Each reference is indexed into the test’s vector DB

---

## 7) API Highlights

```
POST /api/upload-material
POST /api/generate-questions
POST /api/question-paper
POST /api/material-library/reference
GET  /api/material-library/chapters?testId=...
POST /api/upload-model-answer
POST /api/upload-student-answer
POST /api/evaluate-answer
GET  /api/results
```

---

## 8) Troubleshooting

### No chapters found
- Ensure the material contains headings like “Chapter 1: …” or “Unit 2 – …”

### No questions generated
- Ensure at least one material is uploaded or referenced

### Frontend not loading
```bash
cd frontend
npm start
```

### Backend not running
```bash
cd backend
npm start
```

---

---

## ✅ Summary
TES is a full pipeline for **material ingestion → chapter extraction → question generation → evaluation → results**, with reusable canonical materials and multi‑chapter filtering for precise question targeting.
