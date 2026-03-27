# 🎯 MARKING SCHEME FEATURE - START HERE

## What You Just Got

A complete **marking scheme system** that lets you define exactly how AI should grade student answers. No more subjective AI scoring - now it follows YOUR grading criteria.

---

## In 60 Seconds

```
WITHOUT Marking Scheme:
Question: "Explain photosynthesis"
Student: "Plants use light to make food"
AI: "Looks good" → Score: 6/10 (subjective)

WITH Marking Scheme:
Question: "Explain photosynthesis"
Marking Scheme:
├─ Mention light energy (2m) ✓ Found
├─ Mention water input (2m) ✗ Missing
├─ Mention glucose (2m) ✓ Found
├─ Mention oxygen (2m) ✗ Missing
└─ Common mistake: forgot water (-0.5m)

Student: "Plants use light to make food"
AI: "Score: 3.5/10 (2m + 2m - 0.5m = 3.5m)"
Matched: light, glucose
Missing: water, oxygen
Feedback: "Good concepts but water and oxygen are critical..."
```

---

## What Was Built

### Backend
✅ **MarkingScheme Model** - Store marking criteria  
✅ **Marking Schemes API** - Create/Read/Update/Delete schemes  
✅ **Enhanced Evaluation** - AI uses schemes for scoring  
✅ **Results Storage** - Track which scheme was used  

### Frontend
✅ **Marking Schemes Page** - UI to manage schemes  
✅ **Navbar Link** - Easy access  
✅ **Responsive Design** - Works on all devices  

### Integration
✅ **Auto Detection** - System finds scheme by question text  
✅ **Batch Upload** - All students scored with same criteria  
✅ **Transparent Results** - Shows matched/missing concepts  

---

## Get Started in 3 Steps

### Step 1: Open Marking Schemes
```
Login → Click "Marking Schemes" in navbar
```

### Step 2: Create Your First Scheme
```
Click: "+ New Marking Scheme"

Fill:
Question: "Explain photosynthesis"
Max Marks: 10
Description: "Full understanding of photosynthesis process"

Add Concepts:
├─ Sunlight energy (2m) Required ✓
├─ Water input (2m) Required ✓
├─ Glucose output (2m) Required ✓
├─ Oxygen output (2m)
└─ Chlorophyll role (2m)

Add Mistakes:
├─ Only happens during day (-1m)
└─ Forgot water (-1m)

Click: "Save Marking Scheme"
```

### Step 3: Evaluate Students
```
Upload model answer for photosynthesis
Upload student answers
Click "Evaluate"
→ AI uses YOUR scheme automatically!
→ Shows exactly which concepts matched
→ Explains each mark
```

---

## See It In Action

### Example Evaluation

**Question:** Explain photosynthesis

**Marking Scheme:** (created above)

**Student Answer:**
```
"Photosynthesis happens when plants take in carbon dioxide and water,
and use sunlight to convert these into glucose. Oxygen is released as 
a byproduct. This process happens in the chloroplasts of plant cells."
```

**AI Evaluation Using Scheme:**
```
✅ MATCHED CONCEPTS (8 marks):
   • Sunlight energy (2m)
   • Water input (2m)
   • Glucose output (2m)
   • Oxygen output (2m)

❌ MISSING CONCEPTS (2 marks):
   • Chlorophyll role

⚠️ DEDUCTIONS (0 marks):
   • No common mistakes detected

📊 MARKS BREAKDOWN:
   Key concepts: 8/10
   Deductions: 0
   Total: 8/10

💬 FEEDBACK:
"Excellent answer! You understood the full process including inputs 
(water, CO₂, light), outputs (glucose, oxygen), and location (chloroplasts). 
To get full marks, mention the role of chlorophyll in capturing light energy."
```

---

## Features Explained

### Key Concepts
Define what students must know/include
```
Concept: "Chlorophyll role"
Marks: 2
Description: "Absorbs light energy in chloroplasts"
Required: Yes (emphasizes importance)
```

### Marks Distribution
Allocate points by topic importance
```
Total: 10 marks

Critical (Required):
├─ Definition (2m)
├─ Inputs (2m)
└─ Outputs (2m)

Important:
└─ Mechanisms (2m)

Nice to Have:
└─ Chlorophyll detail (2m)
```

### Common Mistakes
Deduct marks for frequent errors
```
Mistake: "Only happens in daytime"
Deduction: 1 mark
Explanation: "Actually needs only light, not daytime specifically"
```

### Auto Rubric
System generates formatted instructions for AI
```
The AI receives:

QUESTION: Explain photosynthesis
MODEL ANSWER: [retrieved context]
STUDENT ANSWER: [student's response]
MARKING SCHEME:
├─ Definition (2m)
├─ Inputs: CO₂ + water (2m)
├─ Outputs: glucose + O₂ (2m)
├─ Chlorophyll role (2m)
├─ Common mistakes: [...]
└─ Score between 0-10 marks

EVALUATE STRICTLY USING THIS SCHEME
```

---

## Benefits

### 💎 Quality
- AI focuses on what matters
- No hallucination (limited to scheme)
- Better feedback

### ⚖️ Fairness
- Same criteria for all students
- Transparent grading
- Consistent scoring

### 📊 Transparency
- Students see exact requirements
- Understand why they got marks
- Know what to improve

### 🎯 Consistency
- Same question = same marking
- No mood-based variation
- Reproducible results

---

## Common Use Cases

### Biology Question
```
"Explain the process of mitosis"
Concepts:
├─ Definition (2m)
├─ Phases: prophase (2m)
├─ Phases: metaphase (2m)
├─ Phases: anaphase (2m)
└─ Phases: telophase (2m)

Total: 10 marks
Mistakes: Forgot spindle fiber role (-1m)
```

### Math Problem
```
"Solve quadratic equation 2x² + 5x - 3 = 0"
Concepts:
├─ Correct identification (1m)
├─ Correct method (3m)
├─ Correct calculations (3m)
└─ Correct answer (3m)

Total: 10 marks
Mistakes: Sign error (-1m), Arithmetic (-0.5m)
```

### Essay Question
```
"Analyze the themes in Shakespeare's Hamlet"
Concepts:
├─ Identify madness theme (2m)
├─ Identify revenge theme (2m)
├─ Provide textual evidence (2m)
├─ Analyze symbolism (2m)
└─ Coherent argument (2m)

Total: 10 marks
```

---

## Full Workflow

```
                    ┌─────────────────────┐
                    │ Create Marking      │
                    │ Scheme for Q1       │
                    │ (5 concepts, 10m)   │
                    └──────────┬──────────┘
                              │ Save
                              ▼
                    ┌─────────────────────┐
                    │ Batch Upload 50     │
                    │ Student Answers     │
                    │ for Q1              │
                    └──────────┬──────────┘
                              │ Process each
                              ▼
                    ┌─────────────────────┐
                    │ System Finds Scheme │
                    │ Load from DB        │
                    └──────────┬──────────┘
                              │ Generate rubric
                              ▼
                    ┌─────────────────────┐
                    │ AI Evaluates 50     │
                    │ Using YOUR Scheme   │
                    │ ~50-100 seconds     │
                    └──────────┬──────────┘
                              │ All scored
                              ▼
                    ┌─────────────────────┐
                    │ View Results        │
                    │ ├─ All 50 graded    │
                    │ ├─ Same criteria    │
                    │ ├─ Show gaps        │
                    │ └─ Detailed feedback│
                    └─────────────────────┘
```

---

## Documentation

### Quick Reference (5 min)
→ Read: `MARKING_SCHEME_QUICK.md`

### Complete Guide (15 min)
→ Read: `MARKING_SCHEME_GUIDE.md`

### Technical Details
→ Read: `MARKING_SCHEME_IMPLEMENTATION.md`

---

## Questions Answered

**Q: When is marking scheme used?**
A: Every time you evaluate a student answer for a question that has a scheme

**Q: Can I edit after grading?**
A: Yes, but only new evaluations use the updated scheme

**Q: What if student's wording differs?**
A: AI understands synonyms. Add descriptions to help it understand

**Q: How many concepts should I create?**
A: 4-8 is typical. More for complex topics, fewer for simple

**Q: Does it work with batch upload?**
A: Yes! All 50 students scored with same scheme

**Q: Can students see the scheme?**
A: Not yet, but feedback shows what was expected

---

## Next Steps

1. **Try it now:**
   ```bash
   cd /home/ansh/Desktop/TES
   bash start.sh
   ```

2. **Navigate to:**
   ```
   http://localhost:3000
   Dashboard → Marking Schemes
   ```

3. **Create your first scheme:**
   - Pick any question you evaluate
   - List 4-8 key concepts
   - Assign marks (total = max marks)
   - Save

4. **Test evaluation:**
   - Upload model answer
   - Upload student answer
   - Click Evaluate
   - See your scheme in use!

5. **Try batch upload:**
   - Create scheme for a question
   - Upload multiple student answers
   - System uses same scheme for all

---

## Files You Can Reference

```
/home/ansh/Desktop/TES/
├─ MARKING_SCHEME_QUICK.md           ← 5-min quick start
├─ MARKING_SCHEME_GUIDE.md           ← Complete guide  
├─ MARKING_SCHEME_IMPLEMENTATION.md  ← Technical details
│
├─ backend/src/
│  ├─ models/MarkingScheme.js
│  ├─ routes/markingSchemes.js
│  └─ services/aiService.js (updated)
│
└─ frontend/src/components/
   ├─ MarkingScheme.js
   └─ MarkingScheme.css
```

---

## Summary

| Before | After |
|--------|-------|
| AI subjectively grades | AI follows your scheme |
| No transparency | Shows matched/missing concepts |
| Inconsistent marking | Same criteria for all |
| Hard to explain grades | Detailed breakdown |
| 5-7 minutes per answer | Same speed, better quality |

**Result: Fair, transparent, consistent grading!** 🎯

---

## Ready?

```
1. Start system: bash start.sh
2. Go to: http://localhost:3000
3. Click: Marking Schemes (navbar)
4. Click: + New Marking Scheme
5. Create your first scheme!
```

**That's it! Your AI grader now follows your rules.** ✨
