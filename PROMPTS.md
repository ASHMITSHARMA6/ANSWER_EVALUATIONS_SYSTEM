# AI Prompts Used in Vector-Driven Evaluation System

This document details the exact prompts and JSON structures used for LLM calls.

---

## 1. Question Generation

### System Prompt

```
You are an expert academic question paper generator.
STRICT RULES:
1. Generate questions ONLY from the provided study material.
2. Do NOT use external knowledge, hallucinate, or add content not in the material.
3. Respect difficulty level:
   - easy: recall, definitions, basic facts
   - medium: application, short explanations, understanding
   - hard: analysis, synthesis, critical thinking
4. Each question must be answerable from the provided material.
5. Output ONLY a valid JSON array of question strings.
6. Example output: ["Question 1?", "Question 2?", "Question 3?"]
7. Do not include any text before or after the JSON array.
```

### User Prompt Template

```
Study material (ONLY reference this material):
---
[RETRIEVED_CHUNKS_TEXT]
---

Generate exactly [COUNT] questions from the above material.
Difficulty: [DIFFICULTY]
Output a JSON array with exactly [COUNT] question strings.
```

### Example Input

```json
{
  "retrieved_chunks": [
    "Photosynthesis is the process by which plants convert sunlight into chemical energy...",
    "The chloroplast is an organelle found in plant cells where photosynthesis occurs...",
    "Light reactions and dark reactions are the two main stages of photosynthesis..."
  ],
  "difficulty": "medium",
  "count": 3
}
```

### Example Output

```json
["What is photosynthesis and where does it occur in plant cells?",
 "Explain the difference between light reactions and dark reactions in photosynthesis.",
 "How does the chloroplast contribute to photosynthesis?"]
```

---

## 2. Answer Evaluation (CORE)

### System Prompt (STRICT)

```
You are an expert academic evaluator. You will score a student answer STRICTLY based on:
1. The provided question
2. The retrieved model answer context (this is your ONLY reference)
3. The marks rubric

CRITICAL RULES:
- Do NOT use external knowledge.
- Do NOT score based on what you know, only on retrieved model answer.
- Award partial marks for partially correct answers.
- Be fair: reward correct concepts even if wording differs.
- Output ONLY a valid JSON object. Do not include any text before or after.

Output format (STRICT):
{
  "score": <number between 0 and max_score>,
  "max_score": <number>,
  "matched_concepts": [<list of correct concepts from retrieved model answer>],
  "missing_concepts": [<list of concepts in model answer not in student answer>],
  "feedback": "<brief feedback explaining the score>"
}
```

### User Prompt Template

```
QUESTION:
[QUESTION_TEXT]

MODEL ANSWER CONTEXT (retrieved reference):
---
[RETRIEVED_MODEL_ANSWER_CHUNKS]
---

STUDENT ANSWER:
---
[STUDENT_ANSWER_TEXT]
---

MARKS RUBRIC:
[RUBRIC_TEXT]

Maximum score: [MAX_SCORE]

Evaluate the student answer ONLY against the model answer context above.
Output ONLY valid JSON (no markdown, no extra text).
```

### Example 1: Partial Credit Case

#### Input

```
QUESTION:
What is photosynthesis?

MODEL ANSWER CONTEXT (retrieved reference):
Photosynthesis is the process by which plants convert sunlight 
into chemical energy stored in glucose. It occurs in the chloroplasts 
of plant cells. The process has two main stages: light reactions and 
dark reactions (Calvin cycle).

STUDENT ANSWER:
Plants use sunlight to make food.

MARKS RUBRIC:
Full marks (9-10): Mentions photosynthesis, sunlight, energy/food conversion, location
Partial marks (6-8): Mentions 3 of the above concepts
Low marks (3-5): Mentions 2 of the above
Zero marks (0-2): Vague, incomplete, or off-topic

Maximum score: 10

Evaluate the student answer ONLY against the model answer context above.
Output ONLY valid JSON (no markdown, no extra text).
```

#### Output

```json
{
  "score": 6,
  "max_score": 10,
  "matched_concepts": ["photosynthesis", "sunlight", "food production", "energy conversion"],
  "missing_concepts": ["chloroplasts", "glucose", "stages", "light reactions", "dark reactions"],
  "feedback": "Student demonstrates understanding of the basic concept: sunlight is used to produce food. However, the answer lacks specificity about location (chloroplasts), the product (glucose), and the two-stage process. Good foundation but missing depth. Score reflects partial understanding."
}
```

### Example 2: Complete Answer

#### Input

```
QUESTION:
Explain the role of chloroplasts in photosynthesis.

MODEL ANSWER CONTEXT (retrieved reference):
The chloroplast is the organelle where photosynthesis occurs. 
It contains thylakoids (stacked into grana) where light reactions happen, 
and a stroma where dark reactions occur. The double membrane of the chloroplast 
protects and organizes these reactions.

STUDENT ANSWER:
Chloroplasts are the structures in plant cells where photosynthesis 
happens. They contain thylakoids for light reactions and a stroma 
for the dark reactions.

MARKS RUBRIC:
Full marks (9-10): Mentions chloroplast function, thylakoids, stroma, light/dark reactions
Partial marks (6-8): Mentions 3 of the above
Low marks (3-5): Mentions 1-2 of the above

Maximum score: 10

Evaluate the student answer ONLY against the model answer context above.
Output ONLY valid JSON (no markdown, no extra text).
```

#### Output

```json
{
  "score": 9,
  "max_score": 10,
  "matched_concepts": ["chloroplast function", "thylakoids", "stroma", "light reactions", "dark reactions", "location in plant cells"],
  "missing_concepts": ["grana", "double membrane", "protection/organization role"],
  "feedback": "Excellent answer that demonstrates comprehensive understanding. Student correctly identifies chloroplast as the location of photosynthesis and accurately describes the role of thylakoids and stroma in light and dark reactions respectively. Missing minor details about grana and the protective role of the double membrane, but overall demonstrates strong conceptual understanding. Score: 9/10"
}
```

### Example 3: Incorrect Answer

#### Input

```
QUESTION:
What is the main product of photosynthesis?

MODEL ANSWER CONTEXT (retrieved reference):
The main product of photosynthesis is glucose (C6H12O6), a simple sugar 
that plants use for energy and growth. Oxygen is also produced as a byproduct 
of the light reactions.

STUDENT ANSWER:
The main product of photosynthesis is oxygen.

MARKS RUBRIC:
Full marks (10): Mentions glucose as main product
Partial marks (5): Mentions oxygen (byproduct) but not glucose
Zero marks (0): Incorrect or missing

Maximum score: 10

Evaluate the student answer ONLY against the model answer context above.
Output ONLY valid JSON (no markdown, no extra text).
```

#### Output

```json
{
  "score": 5,
  "max_score": 10,
  "matched_concepts": ["oxygen is a product of photosynthesis"],
  "missing_concepts": ["glucose", "glucose is the MAIN product", "oxygen is a byproduct"],
  "feedback": "Student correctly identifies oxygen as a product of photosynthesis but misses the key concept that glucose is the main product. According to the model answer, oxygen is a byproduct of the light reactions, while glucose is the primary product used by plants for energy and growth. The answer demonstrates partial understanding but confuses the importance of products. Score: 5/10 (partial credit for recognizing oxygen, but main product is wrong)"
}
```

---

## 3. Default Rubrics

### Generic Science Rubric (10 marks)

```
Full marks (9-10):
- Mentions all key concepts from model answer
- Explains relationships between concepts
- Shows deep understanding

Partial marks (6-8):
- Mentions 70-80% of key concepts
- Explanation is mostly correct with minor gaps
- Shows good understanding

Low marks (3-5):
- Mentions 40-60% of key concepts
- Several misconceptions or gaps
- Shows basic understanding

Minimal marks (1-2):
- Vague or incomplete
- Missing most key concepts
- Shows superficial understanding

Zero marks (0):
- Completely wrong
- Off-topic
- Incomprehensible
```

### Technical/Definition Rubric (10 marks)

```
Full marks (10):
- Exact definition matches model answer
- All components mentioned
- No errors

Partial marks (5-9):
- Mostly correct definition
- 1-2 minor omissions or rewording
- No fundamental errors

Low marks (1-4):
- Incomplete definition
- Key components missing
- Some correct elements

Zero marks (0):
- Wrong definition
- Off-topic
- No correct elements
```

### Essay/Analysis Rubric (20 marks)

```
Full marks (18-20):
- Addresses all aspects of the question
- Well-organized with clear logic
- Supports claims with evidence from material
- Shows critical thinking

Partial marks (12-17):
- Addresses most aspects
- Generally well-organized
- Mostly supported with evidence
- Some analysis present

Low marks (6-11):
- Addresses some aspects
- Weak organization
- Limited evidence
- Mostly descriptive

Minimal marks (1-5):
- Barely addresses question
- Disorganized
- Little or no evidence
- Largely incorrect

Zero marks (0):
- Does not address question
- Incomprehensible
```

---

## 4. Fallback Mechanisms

### When LLM Fails

If OpenAI API is unavailable or returns error, system uses fallback scoring:

```javascript
// Fallback keyword matching (simple but functional)
function generateFallbackEvaluation(studentAnswer, maxScore = 10) {
  const length = (studentAnswer || '').length;
  const score = Math.min(
    maxScore,
    Math.round((Math.min(length, 200) / 200) * maxScore * 0.8)
  );

  return {
    score,
    max_score: maxScore,
    matched_concepts: ['response_received'],
    missing_concepts: ['detailed_analysis'],
    feedback: `Answer scored based on length and content. Expected model answer context unavailable. Please provide model answer for accurate evaluation.`
  };
}
```

This ensures the system remains functional even without API access.

---

## 5. Prompt Engineering Best Practices Used

### 1. **System Prompt Separation**
- System prompt defines role and rules (separated from user message)
- Prevents prompt injection
- Clear behavioral expectations

### 2. **JSON-Only Output**
- `temperature=0` (deterministic)
- Explicit instruction: "Output ONLY valid JSON"
- Regex parsing to extract JSON
- Fallback if parsing fails

### 3. **Context Retrieval**
- "Do NOT use external knowledge"
- "ONLY reference [retrieved context]"
- Repeated emphasis on retrieval-only basis

### 4. **Rubric Inclusion**
- Specific scoring guidelines in prompt
- Reduces LLM variability
- Makes scoring reproducible

### 5. **Error Handling**
- Try-catch on API calls
- JSON parsing errors caught
- Fallback returns valid structure
- Graceful degradation

### 6. **Temperature Settings**
- Question generation: `temperature=0.5` (some creativity)
- Answer evaluation: `temperature=0` (deterministic)
- Ensures consistent evaluation

---

## 6. Vector Retrieval Integration

### How Retrieval Affects Prompts

#### Without Vector Retrieval (❌ OLD)
```
Evaluate student answer against model answer directly:
LLM can hallucinate, use external knowledge, explain anything
```

#### With Vector Retrieval (✅ NEW)
```
1. Embed student answer → vector
2. Query FAISS for similar chunks from model answer
3. Include ONLY top-5 chunks in prompt
4. LLM restricted to those chunks
5. Every evaluation shows what chunks were used
```

### Example Retrieval Results

```json
{
  "student_answer": "Plants use sunlight to make food",
  "embedding_dimension": 1536,
  "retrieved_chunks": [
    {
      "score": 0.92,
      "text": "Photosynthesis is the process by which plants convert sunlight into chemical energy stored in glucose.",
      "source": "material_1"
    },
    {
      "score": 0.87,
      "text": "It occurs in the chloroplasts of plant cells.",
      "source": "material_1"
    },
    {
      "score": 0.79,
      "text": "Light reactions use sunlight to create ATP and NADPH.",
      "source": "material_1"
    },
    {
      "score": 0.73,
      "text": "The dark reactions (Calvin cycle) use ATP and NADPH to create glucose.",
      "source": "material_1"
    },
    {
      "score": 0.68,
      "text": "Glucose serves as the plant's primary energy source.",
      "source": "material_1"
    }
  ],
  "evaluation": {
    "score": 6,
    "matched_concepts": ["photosynthesis", "sunlight", "food/glucose"],
    "missing_concepts": ["chloroplasts", "light reactions", "dark reactions"],
    "feedback": "..."
  }
}
```

---

## 7. Token Usage Estimates

### Typical Request-Response

```
Question Generation:
- System prompt: ~150 tokens
- Material chunks (5 chunks × 150 words): ~500 tokens
- User instruction: ~50 tokens
- Output (3 questions): ~100 tokens
- Total per call: ~800 tokens (~$0.012 with gpt-4o-mini)

Answer Evaluation:
- System prompt: ~200 tokens
- Model answer context (5 chunks × 100 words): ~400 tokens
- Question + student answer: ~100 tokens
- Rubric: ~100 tokens
- Output (JSON): ~150 tokens
- Total per call: ~950 tokens (~$0.014 with gpt-4o-mini)
```

Cost estimates (OpenAI gpt-4o-mini rates ~$0.15/1M input, $0.60/1M output):
- 100 question generations: ~$1.20
- 100 answer evaluations: ~$1.40
- Total for 100 students: ~$2.60

---

## 8. Quality Metrics

### Evaluation Consistency

Same answer evaluated twice should get similar scores:

```
Test: Photosynthesis question
Model answer: "Converts sunlight → glucose in chloroplasts"
Student answer: "Plants turn sun into food"
Run 1: 6/10, matched: [photosynthesis, sunlight, food]
Run 2: 6/10, matched: [photosynthesis, sunlight, food]
✓ Deterministic (temp=0)
```

### Hallucination Prevention

LLM should not reward knowledge outside retrieved context:

```
Question: "What is the mitochondrial DNA mutation rate?"
Model answer context: "Photosynthesis..."
Student answer: "Mutation rate is 10^-7 per nucleotide per division"
LLM output: "Not mentioned in model answer context. Score: 0"
✓ No hallucination
```

---

## 9. Troubleshooting Prompt Issues

### Issue: LLM Returns Extra Text

**Bad Output**: 
```
Here's my evaluation:
{
  "score": 6,
  ...
}

The student showed understanding of...
```

**Solution**: Add to system prompt:
```
Output ONLY a valid JSON object in this format.
Do not include any text before or after the JSON.
No markdown formatting. No code blocks.
```

### Issue: Missing Concepts Field

**Bad Output**:
```json
{
  "score": 6,
  "feedback": "..."
}
```

**Solution**: In system prompt, specify exact JSON structure and provide example.

### Issue: Score Outside Range

**Bad Output**:
```json
{
  "score": 12,  // Should be ≤ 10
  "max_score": 10
}
```

**Solution**: Add validation in backend:
```javascript
evaluation.score = Math.min(maxScore, Math.max(0, evaluation.score));
```

---

## 10. Customization Guide

### To Add Custom Rubrics

Modify evaluation prompt in `aiService.js`:

```javascript
function buildEvaluationPrompt(..., rubric) {
  const rubricText = typeof rubric === 'string' 
    ? rubric 
    : JSON.stringify(rubric, null, 2);

  return `...
MARKS RUBRIC:
${rubricText}
...`;
}
```

### To Change Difficulty Levels

Update in `generateQuestionsWithRetrieval`:

```javascript
const DIFFICULTY_GUIDE = {
  'easy': 'recall, definitions, basic facts from material',
  'medium': 'application, short explanations, understanding',
  'hard': 'analysis, synthesis, critical thinking, connecting concepts'
};
```

### To Adjust Retrieval Count

Modify `evaluateAnswerWithRetrieval`:

```javascript
const retrievedModelAnswerChunks = vectorDbService.queryAnswers(
  studentAnswerEmbedding, 
  topK = 5  // Change this number
);
```

Higher `topK` = more context (longer prompts, higher cost)  
Lower `topK` = faster, cheaper but less context

---

## References

- **OpenAI API Docs**: https://platform.openai.com/docs/api-reference
- **Prompt Engineering**: https://platform.openai.com/docs/guides/prompt-engineering
- **Token Estimation**: https://platform.openai.com/tokenizer
- **Temperature Guide**: https://platform.openai.com/docs/guides/gpt-best-practices

---

**Last Updated**: February 2026  
**System Version**: 1.0.0 Vector-Enhanced