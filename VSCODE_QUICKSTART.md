# Quick Start in VS Code

## 1. Open Workspace

```bash
# Open project folder
code /home/ansh/Desktop/TES
```

---

## 2. Terminal Setup (4 Terminals)

### Terminal 1: MongoDB
```bash
# Check if running
mongosh

# If not running, start:
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Exit with: exit
```

### Terminal 2: Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env in VS Code (change OPENAI_API_KEY if needed)
npm install
npm run seed
npm start
# Should see: "Server running on http://localhost:5000"
```

### Terminal 3: Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm start
# Browser should open automatically to http://localhost:3000
```

### Terminal 4: Optional - Monitoring
```bash
# Check vector DB stats
watch -n 2 "curl -s http://localhost:5000/api/debug/vector-db-stats | jq '.'"

# Or monitor backend logs
cd backend && npm start
```

---

## 3. VS Code Extensions (Recommended)

- **REST Client** (REST client for testing APIs)
- **Thunder Client** (API testing)
- **MongoDB for VS Code** (database browsing)
- **Prettier** (code formatting)

---

## 4. Quick Testing

### Create `.rest` file in workspace

`test-api.rest`:
```http
### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "teacher@test.com",
  "password": "teacher123"
}

### Get Vector DB Stats
GET http://localhost:5000/api/debug/vector-db-stats

### Get Results
GET http://localhost:5000/api/results
Authorization: Bearer <TOKEN_FROM_LOGIN>
```

Use REST Client extension to run these requests directly from VS Code.

---

## 5. File Structure

Open folder structure in VS Code Explorer:

```
TES/
├── ARCHITECTURE.md          ← Read this first
├── PROMPTS.md               ← AI prompt details
├── RUN.md                   ← Full setup guide
│
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── vectorDbService.js      ← FAISS index
│   │   │   ├── embeddingService.js     ← OpenAI embeddings
│   │   │   ├── chunkingService.js      ← Text chunking
│   │   │   └── aiService.js            ← LLM evaluation
│   │   │
│   │   ├── routes/
│   │   │   ├── uploadMaterial.js       ← Chunking + embedding
│   │   │   ├── generateQuestions.js    ← Vector QG
│   │   │   ├── evaluateAnswer.js       ← Vector evaluation
│   │   │   └── ...
│   │   │
│   │   └── models/
│   │       ├── Chunk.js                ← NEW
│   │       └── EvaluationResult.js     ← ENHANCED
│   │
│   ├── .env.example
│   ├── package.json
│   └── src/index.js         ← Main server
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── UploadMaterial.js
│   │   │   ├── GenerateQuestions.js
│   │   │   ├── UploadModelAnswer.js
│   │   │   ├── EvaluateAnswer.js       ← CORE FEATURE
│   │   │   ├── ResultsView.js
│   │   │   └── ...
│   │   │
│   │   └── App.js
│   │
│   ├── .env.example
│   └── package.json
│
└── data/
    └── vector_db.json       ← Auto-created FAISS index
```

---

## 6. Key Features to Test

### Feature 1: Material Upload
1. Go to http://localhost:3000
2. Login with: `teacher@test.com` / `teacher123`
3. Click **Upload Material**
4. Paste this sample text:

```
Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose. It occurs in the chloroplasts of plant cells. The process has two main stages: light reactions, which use sunlight to create ATP and NADPH, and dark reactions (Calvin cycle), which use ATP and NADPH to create glucose. The light reactions happen in the thylakoids, while the dark reactions occur in the stroma. Different wavelengths of light are captured by chlorophyll pigments.
```

5. Click **Upload**
6. Check Terminal 2 (backend): should see chunks created and embeddings generated
7. Check `backend/data/vector_db.json`: will contain vectors

### Feature 2: Generate Questions
1. Click **Generate Questions**
2. Select difficulty (medium)
3. Click **Generate**
4. Backend retrieves chunks from FAISS, passes to LLM
5. See generated questions

### Feature 3: Evaluate Answer (MAIN FEATURE)
1. Click **Model Answer**
2. Enter:
   - Question: "What is photosynthesis?"
   - Model Answer: "Process of converting sunlight to glucose in chloroplasts"
   - Max marks: 10
3. Click **Upload Model Answer**

4. Click **Student Answer**
5. Enter: "Plants use light to make food"
6. Click **Upload**

7. Click **Evaluate Answer**
8. **See the magic**: Backend embeds, retrieves model answer chunks, evaluates with LLM
9. Result shows:
   - Score: 6/10
   - Matched concepts: ["photosynthesis", "light", "food"]
   - Missing concepts: ["glucose", "chloroplasts"]
   - Feedback: "Good understanding of basic concept but lacks specificity"

10. Click **Results** to see saved evaluation

---

## 7. Debug Mode

### Check Vector DB Contents

In any terminal:
```bash
curl http://localhost:5000/api/debug/vector-db-stats | jq '.'

# Output:
# {
#   "material": {
#     "size": 5,        (number of chunks)
#     "dimension": 1536 (OpenAI embedding size)
#   },
#   "answers": {
#     "size": 1,
#     "dimension": 1536
#   },
#   "dataFile": "/home/ansh/Desktop/TES/backend/data/vector_db.json",
#   "fileExists": true
# }
```

### Check MongoDB Contents

```bash
mongosh
> use tes
> db.studymaterials.find().pretty()
> db.chunks.find().pretty()
> db.evaluationresults.find().pretty()
> exit
```

### Check Logs

Backend terminal shows:
```
[VectorDB] Initialized fresh indices
[Upload Material] Added 5 material embeddings. Total: 5
[Generate Questions] Retrieved 5 chunks for topic: "undefined"
[AI] OpenAI call successful
[Evaluate Answer] Retrieved 1 model answer chunks
```

---

## 8. Troubleshooting in VS Code

### Port Already in Use

If `npm start` fails with "EADDRINUSE :::5000":

**Solution 1**: Kill process
```bash
# In VS Code terminal
lsof -ti:5000 | xargs kill -9
npm start
```

**Solution 2**: Use different port
```bash
PORT=5001 npm start
```

### MongoDB Connection Error

If backend shows "connect ECONNREFUSED":

```bash
# Terminal 1: Start MongoDB
mongosh

# Should connect. If error, check if mongod is running
ps aux | grep mongod
```

### OpenAI API Error

If you see "Error: Invalid API key":

**Option 1**: Add real API key to `.env`:
```
OPENAI_API_KEY=sk-proj-your-real-key
```

**Option 2**: System falls back to mock embeddings automatically (still works!)

### CORS Error in Frontend

If frontend can't reach backend:

1. Check backend is running: `curl http://localhost:5000/api/health`
2. Check CORS in `backend/src/index.js` allows `http://localhost:3000`
3. Verify `frontend/.env` has correct `REACT_APP_API_BASE_URL`

---

## 9. Code Navigation in VS Code

### Jump to Definition
- Click a function name → press `F12` or `Ctrl+Click`
- Example: `vectorDbService.queryMaterial` → opens `vectorDbService.js`

### Find Usage
- Right-click → "Find All References"
- Example: Find all calls to `evaluateAnswerWithRetrieval`

### Search Across Files
- `Ctrl+Shift+F` or `Cmd+Shift+F`
- Search: "evaluateAnswerWithRetrieval"
- See: `aiService.js`, `evaluateAnswer.js`, `PROMPTS.md`

### Integrated Terminal
- `Ctrl+`` opens terminal inside VS Code
- Multiple tabs for backend, frontend, MongoDB, etc.

---

## 10. Development Workflow

### Make a Change

Example: Modify evaluation system prompt

1. Open `backend/src/services/aiService.js`
2. Find `const EVAL_SYSTEM = ...`
3. Edit system prompt
4. Save (Ctrl+S)
5. Backend auto-restarts (if using `npm run dev`)
6. Refresh http://localhost:3000 (frontend)
7. Test evaluation again

### Debug API Response

1. Open `test-api.rest`
2. Run request with REST Client
3. See response in VS Code side panel
4. Or check network tab in browser DevTools (F12)

### Monitor Real-Time Logs

Terminal with `npm start` shows all logs:
```
[VectorDB] Persisted to disk
[Evaluate Answer] Retrieved 1 chunks
[AI] OpenAI call successful
```

---

## 11. Useful VS Code Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Terminal | Ctrl+` |
| New Terminal | Ctrl+Shift+` |
| Search Files | Ctrl+P |
| Search Across Files | Ctrl+Shift+F |
| Go to Line | Ctrl+G |
| Format Document | Shift+Alt+F |
| Copy Line | Ctrl+C (cursor on line) |
| Delete Line | Ctrl+Shift+K |
| Comment Line | Ctrl+/ |

---

## 12. Next Steps

1. ✅ Run system and test features
2. ✅ Read `ARCHITECTURE.md` to understand vector DB
3. ✅ Read `PROMPTS.md` to see exact LLM prompts
4. ✅ Modify prompts or rubrics as needed
5. ✅ Try different student answers and watch evaluation

---

**Ready to go!** 🚀 Use terminals to start backend and frontend, then visit `http://localhost:3000` in browser.