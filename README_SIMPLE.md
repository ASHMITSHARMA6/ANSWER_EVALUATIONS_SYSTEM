# 🚀 INSTANT START - Vector Evaluation System

## Choose Your Method:

### Option 1: Automatic (Fastest)

**Linux/Mac:**
```bash
cd /home/ansh/Desktop/TES
bash start.sh
```

**Windows:**
```bash
cd C:\Users\YourName\Desktop\TES
start.bat
```

**Result:** Backend + Frontend start automatically in 30 seconds

---

### Option 2: Manual (Detailed Control)

#### Terminal 1 - Backend:
```bash
cd /home/ansh/Desktop/TES/backend
cp .env.example .env
# Edit .env: Add your MONGODB_URI and OPENAI_API_KEY
npm install
npm run seed
npm start
```

#### Terminal 2 - Frontend:
```bash
cd /home/ansh/Desktop/TES/frontend
cp .env.example .env
npm install
npm start
```

#### Then Open:
```
http://localhost:3000
```

---

## Login

```
Email:    teacher@test.com
Password: teacher123
```

---

## First Steps (5 minutes)

1. **Upload Material**
   - Dashboard → Upload Material
   - Paste any text (e.g., exam study notes)

2. **Upload Model Answer**
   - Dashboard → Upload Model Answer
   - Enter a question and ideal answer

3. **Try Batch Upload (NEW!)**
   - Dashboard → **Batch Upload**
   - Select multiple answer files (PDF/TXT/JSON)
   - Click "Upload & Process"
   - Results appear one-by-one

4. **View Results**
   - Dashboard → Results
   - See scores, matched concepts, missing concepts

---

## What Happens in Batch Upload

```
You select 5 PDF files
         ↓
System processes each one-by-one:
  ✓ Extract text from PDF
  ✓ Convert to embedding (vector)
  ✓ Query vector DB for similar model answer chunks
  ✓ LLM scores with ONLY retrieved context
  ✓ Save: Score, Matched concepts, Missing concepts, Feedback
         ↓
Results display:
  - Individual: student1.pdf → 85/100, [Matched: ...], [Missing: ...]
  - Individual: student2.pdf → 72/100, [Matched: ...], [Missing: ...]
  - ... (all files)
  - Summary: Average 82/100, Range 72-92, Time 8.3s
```

---

## File Formats Supported

- ✅ **PDF** (text-based, not scanned images)
- ✅ **TXT** (plain text)
- ✅ **JSON** (format: `{"answer": "text here"}`)

---

## MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# Then start it:
mongod

# Update .env:
MONGODB_URI=mongodb://localhost:27017/evaluation_db
```

**Option B: MongoDB Atlas (Cloud)**
```
1. Create account: mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Update .env:
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/evaluation_db
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change PORT in .env |
| Port 3000 in use | Change port in frontend (see npm start) |
| MongoDB won't connect | Check MONGODB_URI in .env |
| Login fails | Run `npm run seed` in backend |
| Batch upload fails | Check file formats, restart system |
| No results showing | Check model answer uploaded first |

---

## System Requirements

✅ Node.js 18+  
✅ MongoDB (local or Atlas)  
✅ 100 MB disk space  
✅ Internet (optional - works offline with mock embeddings)  

---

## Environment Variables

**Required** (edit .env):

```bash
# Backend .env
MONGODB_URI=mongodb://localhost:27017/evaluation_db
JWT_SECRET=your-super-secret-key-here-make-it-long
OPENAI_API_KEY=sk-your-openai-api-key (optional)

# Frontend .env
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

---

## Features

| Feature | How to Use |
|---------|-----------|
| Upload material | Material tab |
| Generate questions | Questions tab |
| Upload model answer | Model Answer tab |
| Single answer eval | Student Answer tab → Evaluate |
| **Batch eval** ⭐ | **Batch Upload tab** |
| View results | Results tab |
| Export results | Results tab (coming soon) |

---

## Batch Upload Examples

### Example 1: 3 Student Answers
```
Folder: ~/exam_answers/
├── student_1.pdf
├── student_2.pdf
├── student_3.pdf

System processes:
  student_1.pdf → 88/100 ✓
  student_2.pdf → 76/100 ✓
  student_3.pdf → 92/100 ✓
  
Summary: 85/100 avg, 76-92 range, 6.2s total
```

### Example 2: Mixed Formats
```
Folder: ~/answers/
├── alice.pdf
├── bob.txt
├── charlie.json ({"answer": "..."})

System processes each with same pipeline
Results show per-file scores + feedback
```

---

## API Test (Without Frontend)

```bash
# Get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@test.com","password":"teacher123"}'

# Copy token from response, then:
TOKEN="your-token-here"

# Test batch upload
curl -X POST http://localhost:5000/api/batch-upload-answers \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@file1.pdf" \
  -F "files=@file2.pdf" \
  -F "maxScore=100"
```

---

## Success Signs

✅ Backend: "Server running on http://localhost:5000"  
✅ Frontend: Shows "Compiled successfully"  
✅ Browser: http://localhost:3000 loads  
✅ Login works  
✅ Dashboard visible  
✅ Batch Upload tab visible  
✅ Can select files and process  

---

## Next Steps

1. **Right now:** Run `bash start.sh` (or `start.bat`)
2. **Next:** Login with teacher@test.com
3. **Then:** Follow First Steps (5 min workflow)
4. **Try:** Batch upload with your own answer files
5. **Customize:** Edit prompts in `backend/src/services/aiService.js`

---

## For Developers

See additional docs:
- `ARCHITECTURE.md` - System design
- `PROMPTS.md` - AI prompts (customize here!)
- `SYSTEM_OVERVIEW.md` - Technical details
- `START.md` - Detailed startup guide

---

**That's it! System running now. 🎉**

Questions? Check the troubleshooting table above.

Happy evaluating! 📚
