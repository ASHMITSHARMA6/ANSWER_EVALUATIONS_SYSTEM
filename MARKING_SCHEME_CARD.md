## 📋 MARKING SCHEME - QUICK REFERENCE CARD

### What It Is
Define question-specific grading criteria so AI evaluates students fairly and consistently

### What You Get
- Mark Student: AI checks against your marking scheme
- Fair Grading: Same criteria for all students
- Transparent: Shows matched vs missing concepts
- Batch Support: Evaluate 50 students with same scheme

---

### 3-Step Setup

```
1. CREATE SCHEME
   Dashboard → Marking Schemes → New
   Question: Your question
   Concepts: 4-8 items (e.g., "Explain X" = 2m)
   Save

2. UPLOAD ANSWERS
   Model answer + Student answers (same question)

3. EVALUATE
   Click "Evaluate"
   System finds scheme, AI uses it, shows results
```

---

### Example (2 minutes)

**Question:** Explain photosynthesis

**Create Scheme:**
```
Max Marks: 10

Concepts:
├─ Definition (2m) Required
├─ Inputs: Water (2m) Required  
├─ Outputs: Glucose (2m)
├─ Outputs: Oxygen (2m)
└─ Mechanism (2m)

Mistakes:
├─ Only daytime (-1m)
└─ Forgot oxygen (-0.5m)

SAVE
```

**Student Answer:**
"Plants use light and water to make glucose"

**AI Result:**
```
Matched: Definition✓, Water✓, Glucose✓
Missing: Oxygen✗, Mechanism✗
Score: 6/10
```

---

### Key Points

✅ Save time - create once, use for all students  
✅ Fair - same criteria for everyone  
✅ Clear - students see exactly what's expected  
✅ Detailed - shows which concepts matched  
✅ Works with batch - evaluate 50 at a time  

---

### API Quick Reference

```
Create:   POST /api/marking-schemes
Get All:  GET /api/marking-schemes
Get One:  GET /api/marking-schemes/:id
Update:   PUT /api/marking-schemes/:id
Delete:   DELETE /api/marking-schemes/:id
Find:     GET /api/marking-schemes/question/:text
Auto Use: POST /api/evaluate-answer (finds scheme)
```

---

### FAQ

**Q: When is scheme used?**
A: Every evaluation for that question

**Q: Can I edit after?**
A: Yes, but new evaluations use updated scheme

**Q: How many concepts?**
A: 4-8 is typical

**Q: What if student wording differs?**
A: Add description to help AI understand

**Q: Batch upload?**
A: All 50 students scored with same scheme

---

### Fields Explained

| Field | Example |
|-------|---------|
| **Concept** | "Water input" |
| **Marks** | 2 |
| **Description** | "Must mention water" |
| **Required** | ✓ Yes |
| **Mistake** | "Forgot oxygen" |
| **Deduction** | 1 mark |

---

### Before vs After

| Aspect | Without Scheme | With Scheme |
|--------|---|---|
| Subjective | "Looks good" | Objective |
| Criteria | Teacher's mood | Your rubric |
| Transparency | Low | High |
| Consistency | Varies | Same always |
| Feedback | Generic | Specific |

---

### Start Now

```bash
cd /home/ansh/Desktop/TES
bash start.sh
# Open http://localhost:3000
# Click "Marking Schemes"
# Create your first scheme!
```

---

### Documentation Files

- `MARKING_SCHEME_START.md` - Overview (5 min)
- `MARKING_SCHEME_QUICK.md` - Reference (5 min)
- `MARKING_SCHEME_GUIDE.md` - Complete (15 min)
- `MARKING_SCHEME_IMPLEMENTATION.md` - Technical

---

**Status: ✅ READY TO USE**
