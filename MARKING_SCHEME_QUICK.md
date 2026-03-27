# 📋 Marking Scheme - Quick Start (5 minutes)

## What It Does

AI grades student answers using **your** grading criteria, not its own judgment.

```
Before: "This looks good → 7/10" (subjective)
After:  "Missing 1 concept (-2m), correct on 3 concepts (+6m) → 6/10" (objective)
```

---

## Quick Start: 3 Steps

### Step 1: Go to Marking Schemes
```
Click: Navbar → "Marking Schemes"
Click: "+ New Marking Scheme"
```

### Step 2: Enter Question & Concepts
```
Question: "Explain photosynthesis"
Max Marks: 10

Key Concepts:
├─ Sunlight to energy (2 marks) [REQUIRED]
├─ CO₂ + water inputs (2 marks) [REQUIRED]
├─ Glucose + oxygen outputs (2 marks) [REQUIRED]
├─ Chlorophyll role (2 marks)
└─ Two stages: light & dark (2 marks)
```

### Step 3: Save & Use
```
Click: "Save Marking Scheme"

Next evaluation automatically uses it!
```

---

## Real Example (2 Questions)

### Question 1: Basic Definition
```
Question: "What is photosynthesis?"
Max Marks: 5

Concepts:
├─ Definition (2m) Required
├─ Energy conversion (1m)
├─ Location (1m)
└─ Uses glucose (1m)

Common Mistakes:
├─ Says only day (-0.5m)
└─ Forgets water (-0.5m)
```

### Question 2: Complex Process
```
Question: "Explain photosynthesis in detail"
Max Marks: 15

Concepts:
├─ Full definition (2m) Required
├─ Inputs: CO₂, H₂O, Light (3m) Required
├─ Outputs: Glucose, O₂ (3m) Required
├─ Chlorophyll (2m)
├─ Two stages (2m)
├─ Electron transfer (1m)
├─ Plant uses glucose (1m)
└─ Location: chloroplast (1m)

Common Mistakes:
├─ Only happens in day (-1m)
├─ O₂ is waste (-0.5m)
├─ Forgot water (-1m)
└─ Confused with respiration (-1m)
```

---

## How It Works During Evaluation

```
Student uploads answer: "Plants use light to make food..."

System:
1. Finds marking scheme for this question
2. Extracts concepts: light ✓, food ✓, water ✗
3. Calls AI: "Use this scheme, score accordingly"
4. AI returns: "5/10 - found 2/3 basic concepts"

Result shown:
├─ Score: 5/10
├─ Matched: light, food
├─ Missing: water input
├─ Feedback: "Good start, but water is crucial..."
└─ Breakdown: 2 concepts × 2m + 1m bonus = 5m
```

---

## Best Practices

### ✅ Good Marking Scheme
```
Concepts are specific, meaningful, and testable
Marks distributed by importance
Common mistakes documented
Rubric is clear to both student and teacher
```

### ❌ Bad Marking Scheme
```
Too many tiny concepts ("capitalize first letter" - 0.5m)
All concepts same weight (not realistic)
No common mistakes listed
Vague descriptions ("shows understanding" - too broad)
```

---

## Batch Upload + Marking Schemes

**Workflow:**
```
1. Create Marking Scheme for Question A
2. Upload 50 student answers for Question A
3. System evaluates all 50 using YOUR scheme
4. Results:
   ├─ 12 students: 9-10/10 (excellent)
   ├─ 25 students: 6-8/10 (good)
   ├─ 10 students: 3-5/10 (needs work)
   └─ 3 students: 0-2/10 (incomplete)
5. Analysis: Most missed concept X
```

---

## FAQ

**Q: What if student uses different wording?**
A: Add description to concept. AI will understand "sunlight" = "light energy"

**Q: Can I change scheme after grading?**
A: Yes, but only new evaluations use updated scheme

**Q: What about partial answers?**
A: AI awards partial marks. E.g., if concept worth 2m, student might get 1m for partial

**Q: How many concepts should I have?**
A: 4-8 is typical. Depends on question difficulty

**Q: What about bonus marks?**
A: Feature available - for excellence beyond requirements

---

## Fields Explained

| Field | What it means | Example |
|-------|---------------|---------|
| **Concept** | Key idea to look for | "Chlorophyll" |
| **Marks** | Points for this concept | 2 |
| **Description** | Help AI understand | "Captures light in chloroplasts" |
| **Required** | Must be present | ✓ (Yes) |
| **Mistake** | Common error | "Forgot oxygen" |
| **Deduction** | Marks to remove | 1 |

---

## Menu Navigation

```
Dashboard
├─ Marking Schemes ← Click here to manage
│  ├─ View all schemes
│  ├─ Create new
│  ├─ Edit existing
│  └─ Delete
├─ Evaluate (uses scheme automatically)
├─ Batch Upload (evaluates with scheme)
└─ Results (shows which scheme was used)
```

---

## Common Scenarios

### Scenario 1: Science Essay
```
Question: "Explain the water cycle"
Marks: 10
Concepts:
├─ Evaporation (2m) Required
├─ Condensation (2m) Required
├─ Precipitation (2m) Required
├─ Temperature role (2m)
└─ Application to climate (2m)
```

### Scenario 2: Math Problem
```
Question: "Solve 2x + 5 = 13"
Marks: 4
Concepts:
├─ Correct setup (1m) Required
├─ Correct steps (2m) Required
└─ Correct answer (1m) Required

Mistakes:
├─ Sign error (-0.5m)
└─ Arithmetic error (-0.5m)
```

### Scenario 3: Code Review
```
Question: "Write a function to find max element"
Marks: 5
Concepts:
├─ Correct logic (2m) Required
├─ Handles edge cases (1m)
├─ Clear variable names (1m)
└─ Efficient O(n) (1m)
```

---

## TL;DR

1. **Create** marking scheme with concepts and marks
2. **Save** it
3. **Evaluate** students automatically uses your scheme
4. **Results** show which concepts present/missing
5. **Fair** grading: same criteria for all students

🎯 **Result:** Transparent, consistent, fair grading!
