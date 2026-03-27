# 📋 Marking Scheme Feature - Complete Guide

## Overview

The **Marking Scheme** feature allows teachers to define detailed, question-specific grading criteria. The AI evaluator uses these schemes to ensure consistent, fair, and transparent scoring of student answers.

---

## Why Use Marking Schemes?

### Without Marking Scheme
```
Question: Explain photosynthesis
Student Answer: "Plants use sunlight..."
AI: "Hmm, looks reasonable" → Score: 7/10 (subjective)
```

### With Marking Scheme
```
Question: Explain photosynthesis
Marking Scheme:
├─ Mention sunlight (2 marks) ✓
├─ Mention chlorophyll (2 marks) ✗
├─ Mention glucose/energy (2 marks) ✓
├─ Explain electron transfer (2 marks) ✗
└─ Common mistake: forgot oxygen production (-1 mark)

AI: "Score: 5/10 (4 marks + 2 marks - 1 deduction)"
   Matched: Sunlight, Glucose
   Missing: Chlorophyll, Electron transfer
```

**Benefits:**
✅ Transparent: Students see exactly what was expected  
✅ Consistent: Same answer always gets same score  
✅ Fair: Points distributed by importance  
✅ Detailed: Feedback explains each point  
✅ Quality: Instructor defines quality standards  

---

## How to Create a Marking Scheme

### Step 1: Navigate to Marking Schemes
```
Dashboard → "Marking Schemes" (in navbar)
```

### Step 2: Click "New Marking Scheme"

### Step 3: Fill in Basic Information

**Question Text** (Required)
- The exact question this scheme applies to
- Must match question in model answer upload

**Max Marks** (Required)
- Total marks available (1-100)
- Default: 10 marks

**Description**
- Overall rubric description
- E.g., "Standard marking scheme", "Detailed analysis expected"

### Step 4: Add Key Concepts

Each concept represents a thing the student must understand/include:

| Field | Purpose | Example |
|-------|---------|---------|
| **Concept** | What to look for | "Photosynthesis definition" |
| **Marks** | Points for this concept | 2 |
| **Description** | Why it matters (optional) | "Must mention sunlight + chlorophyll" |
| **Required** | Checkbox: Must be present | ✓ (checked) |

**Example:**
```
Concept: "Definition of photosynthesis"
Marks: 2
Description: "Convert light energy to chemical energy"
Required: Yes [✓]
```

Add as many concepts as needed. Total marks = sum of all concept marks.

### Step 5: Add Common Mistakes (Optional)

Track frequent errors to deduct marks:

| Field | Purpose | Example |
|-------|---------|---------|
| **Mistake** | What students often get wrong | "Forgot oxygen production" |
| **Deduction** | Marks to remove | 1 |
| **Explanation** | Why it's wrong (optional) | "Photosynthesis releases O₂" |

**Example:**
```
Mistake: "Said only happens in daytime"
Deduction: 1 mark
Explanation: "Actually needs only sunlight, not day specifically"
```

### Step 6: Review Generated Rubric

Click "View Rubric" to see how the AI will see it:

```
Question: Explain photosynthesis

Marking Scheme:
Standard marking scheme

Key Concepts (6 marks):
1. Sunlight energy (2 marks)
2. Chlorophyll role (2 marks)
3. Glucose production (1 mark)
4. Oxygen release (1 mark) [REQUIRED]

Common Mistakes to Avoid:
1. Forgot oxygen production (-1 mark)
2. Only happens in day (-1 mark)
```

### Step 7: Save

Click "Save Marking Scheme"

---

## Using Marking Schemes in Evaluation

### Manual Evaluation

When you click "Evaluate" on a student answer:

1. **System checks**: Is there a marking scheme for this question?
2. **If YES**: Uses your detailed marking scheme
3. **If NO**: Uses default rubric

The evaluation response shows:
```json
{
  "marks": 7,
  "maxMarks": 10,
  "feedback": "Student demonstrated understanding of 3/4 key concepts. 
              Mentioned sunlight (2m), photosynthesis (2m), and glucose (1m).
              Missing: No mention of oxygen release (required). Deduction 
              for common mistake: -1m. Final: 7/10",
  "marksBreakdown": {
    "total": 7,
    "key_concepts": 5,
    "bonus": 0,
    "deductions": 1
  },
  "matchedConcepts": ["sunlight energy", "glucose production"],
  "missingConcepts": ["oxygen release", "chlorophyll role"],
  "usingMarkingScheme": true
}
```

### Batch Evaluation

When uploading 50 student answers:

1. **System finds** marking scheme for the question
2. **Each student answer** scored using same scheme
3. **Results show** which concepts present/missing for each student
4. **Consistency** guaranteed - same marking for all

**Example Batch Result:**
```
Total: 50 students evaluated
Average: 6.8/10
Range: 3-10

Most common gaps:
├─ Oxygen release (missing in 24/50)
├─ Chlorophyll role (missing in 18/50)
└─ Electron transfer (missing in 35/50)

Most common mistakes:
├─ Only happens in daytime (15 students)
└─ Forgot water involvement (8 students)
```

---

## Complete Example: Biology Question

### Question
```
"Explain the process of photosynthesis, including all key reactants 
and products, and how the plant uses the glucose produced."
```

### Marking Scheme Created

**Basic Info:**
- Max Marks: 10
- Description: "Full understanding of photosynthesis process"

**Key Concepts:**
```
1. Photosynthesis definition (1 mark)
   "Light energy converts to chemical energy"
   Required: Yes

2. Inputs/Reactants (2 marks)
   "Water + Carbon dioxide + Light"
   Required: Yes

3. Chlorophyll role (1 mark)
   "Chlorophyll captures light energy"
   Required: No

4. Outputs/Products (2 marks)
   "Glucose + Oxygen"
   Required: Yes

5. Use of glucose (1 mark)
   "Plant uses glucose for energy and growth"
   Required: No

6. Location in plant (1 mark)
   "Occurs in chloroplasts"
   Required: No

7. Two stages (1 mark)
   "Light reactions and dark reactions"
   Required: No

8. Electron transport (1 mark)
   "Electron transfer during reactions"
   Required: No
```

**Common Mistakes:**
```
1. "Says it only happens during day" (-1 mark)
   "Actually only needs light, not specifically daytime"

2. "Forgot that water is an input" (-1 mark)
   "Water is essential reactant"

3. "Said produces oxygen as waste" (-0.5 marks)
   "Oxygen is useful for respiration, not really waste"

4. "Confused with respiration" (-1 mark)
   "They're opposite processes - photosynthesis makes glucose, 
    respiration uses it"
```

### Evaluation Example

**Student A's Answer:**
```
"Photosynthesis is when plants make food using sunlight. 
CO₂ and water go in. Glucose and oxygen come out. 
Happens in leaves. Plants use glucose to grow."
```

**AI Evaluation Using Scheme:**
```
Score: 7/10

Matched Concepts (7 marks):
✓ Definition (1m) - "plants make food using sunlight"
✓ Inputs (2m) - "CO₂ and water"
✓ Outputs (2m) - "glucose and oxygen"
✓ Location (1m) - "happens in leaves"
✗ Use of glucose (1m) - mentioned "grow" (partial: 1m)

Missing Concepts:
- Chlorophyll role
- Two stages
- Electron transport

Deductions: 0
- No common mistakes detected

Feedback:
"Good understanding of basic process! You correctly identified 
reactants, products, and location. To improve:
- Explain role of chlorophyll in capturing light
- Mention the two stages (light & dark reactions)
- If possible, explain electron transfer mechanism"
```

**Student B's Answer:**
```
"Plants use sunlight to make glucose from CO₂ and water. 
Chlorophyll captures the light energy in chloroplasts. 
Happens in two stages: light reactions and dark reactions. 
Light reactions transfer electrons. Plants use glucose for energy."
```

**AI Evaluation:**
```
Score: 9/10

Matched Concepts (9 marks):
✓ Definition (1m)
✓ Inputs (2m)
✓ Outputs (2m) - implied (glucose mentioned, oxygen understood)
✓ Chlorophyll role (1m)
✓ Location (1m)
✓ Use of glucose (1m)
✓ Two stages (1m)

Deductions: -1 mark
- Didn't explicitly mention oxygen as output

Feedback:
"Excellent! Very comprehensive answer. You demonstrated 
deep understanding including the two stages and electron transfer. 
One small point: explicitly mention oxygen as a product. Perfect!"
```

---

## API Endpoints

### Create/Update Marking Scheme
```
POST /api/marking-schemes
Content-Type: application/json

{
  "questionText": "Explain photosynthesis",
  "maxMarks": 10,
  "description": "Full understanding required",
  "keyConcepts": [
    {
      "concept": "Sunlight energy",
      "marks": 2,
      "description": "Must mention light",
      "isRequired": true
    }
  ],
  "commonMistakes": [
    {
      "mistake": "Only happens in day",
      "marksDeduction": 1,
      "explanation": "Actually only needs light"
    }
  ]
}

Response: { success: true, scheme: {...}, rubric: "..." }
```

### Get All Marking Schemes
```
GET /api/marking-schemes
Response: { success: true, count: 5, schemes: [...] }
```

### Get Marking Scheme by ID
```
GET /api/marking-schemes/:id
Response: { success: true, scheme: {...}, rubric: "..." }
```

### Find by Question Text
```
GET /api/marking-schemes/question/:questionText
Response: { success: true, scheme: {...}, rubric: "..." }
```

### Update Marking Scheme
```
PUT /api/marking-schemes/:id
Content-Type: application/json
Body: { updated fields }
```

### Delete Marking Scheme
```
DELETE /api/marking-schemes/:id
Response: { success: true, message: "Deleted" }
```

---

## Best Practices

### ✅ DO

1. **Define what matters most**
   - Put highest marks on critical concepts
   - Use "Required" checkbox for essential elements

2. **Be specific with concepts**
   ```
   Good:  "Photosynthesis definition" (1m)
   Better: "Light energy to chemical energy" (1m)
   ```

3. **Add realistic common mistakes**
   - Based on what you see in student answers
   - Include deduction to emphasize importance

4. **Keep it reasonable**
   - Don't make concept list too long (5-8 is good)
   - Don't give too many deductions

5. **Use descriptions**
   - Explains to AI what you're looking for
   - Helps with feedback quality

### ❌ DON'T

1. **Don't reuse exact phrases**
   ```
   Bad: Student must say exactly "light energy converts to chemical"
   Good: Student should mention light energy becomes glucose energy
   ```

2. **Don't have concepts sum to wrong total**
   - If maxMarks is 10, concepts should sum to ~10
   - Leave room for deductions

3. **Don't add irrelevant concepts**
   - Only include if truly important
   - Avoid nitpicking small details

4. **Don't forget to save**
   - Click "Save Marking Scheme" at bottom
   - It applies to future evaluations only

---

## Troubleshooting

### Problem: Marking scheme not being used
```
Check:
1. Question text matches EXACTLY
2. Marking scheme is saved (check list page)
3. Evaluate student on same question
```

### Problem: Marks not matching expected values
```
Check:
1. Concept marks sum correctly
2. LLM found the concepts in student answer
3. Deductions were applied correctly
```

### Problem: AI missing concepts
```
This is normal! If student uses different wording:
- AI might not recognize it
- Use detailed descriptions to help AI understand
- Include alternative phrasings in concept description
```

---

## Summary

| Feature | Benefit |
|---------|---------|
| **Key Concepts** | Define what matters, assign marks |
| **Descriptions** | Help AI understand requirements |
| **Required flag** | Emphasis critical elements |
| **Common Mistakes** | Teach through deductions |
| **Bonus Marks** | Reward excellence |
| **Auto Rubric** | AI reads detailed instructions |
| **Transparent** | Students see exactly how marks awarded |
| **Consistent** | Same answer = same score always |

---

**Next Steps:**
1. Create a marking scheme for your next question
2. Upload student answers
3. See how evaluation quality improves!
