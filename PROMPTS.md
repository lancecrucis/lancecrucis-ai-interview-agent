# AI Usage Log

This document tracks the AI prompts used during development of the Interview Agent.

## Development Prompts (Chronological)

### Phase 1: Project Setup & Core Features
**Date:** August 9, 2026

```
Build an AI Interview Agent web app with React frontend and Node.js backend.
The agent should conduct multi-turn technical interviews for graduates of a 31-day AI Cohort.
Use candidates.json and curriculum.json as the data layer.
```

```
name it light and dark. also make the dark mode not too black, make it soft
```

```
i want it to end if the system is satisfied or how the interview finishes it.
Score/Rating (e.g., 4/10, or "Needs Improvement")
Per-topic breakdown (strong on X, weak on Y)
Hire/no-hire recommendation
Specific examples from your answers
i like this ones
```

### Phase 2: UI/UX Improvements
**Date:** August 9, 2026

```
make it white theme. i want it clean and professional
make it inspired by Mobbin or Linear design
remove AI slop emojis and make it minimalist
```

```
add Geist Sans font for primary, Inter as fallback. IDs use Geist Mono
```

```
add dark mode. make the toggle labeled "Light" and "Dark"
```

```
dark mode button colors are white on white, fix it
```

### Phase 3: API & Model Switch
**Date:** August 9, 2026

```
here is the groq api key: [REDACTED]
explain to me so it errors because it does not have any usage
```

```
switch to Groq API. use llama-3.3-70b-versatile
free tier is 14,400 req/day
```

```
guess im all out of usage
Error: Groq 503: llama-3.3-70b-versatile is currently over capacity
```

```
wdym models? so i can just rotate?
```

### Phase 4: Interview Intelligence
**Date:** August 9, 2026

```
maybe lets do what you said do versatile and fall back to instant if usage is limit
```

```
the AI has an internal interview state:

Answer
  ↓
Evaluate
  ↓
┌─────────────────────────────┐
│ Strong? → Increase difficulty│
│ Shallow? → Probe deeper     │
│ Interesting? → Explore      │
│ Contradiction? → Challenge  │
│ Weak? → Reframe             │
└─────────────────────────────┘

also will it be hard to make like an interview map of like neural network
design like in obsidian ai with nodes connecting when the user answer or the
ai questions it will pop up and connect with eachother based on the answer

also more data info in the section where the interview is over

Interviewer "Challenge Moment"

lets discuss first
```

```
maybe remove the knowledge map and focus on the adaptive interview state,
richer feedback (remove comparison, recommended resources, add challenge
moments) also show me what the feedback looks like after an interview
because i dont want to test it out and finish my usage
```

```
okay lets do it
```

```
judge them base on this
Design and build an AI agent capable of conducting a realistic, multi-turn
technical interview.
The interview should:
- Assess the candidate's understanding of the concepts they have completed.
- Adapt naturally throughout the conversation.
- Ask intelligent follow-up questions.
- Maintain context across the interview.
- Provide actionable feedback at the end.
```

```
is it enough to win? or too ordinary
```

### Phase 5: Polish & Documentation
**Date:** August 9, 2026

```
after the search candidate can you add some sort filters based on the best
sort options you can do
```

```
also add a space or gap between search by name, role and remove the text
"or education" and sort option also update the readme in my github thanks
```

```
also have you been updating the prompt and technical md files?
```

```
yes please do so, but dont add the github part thank you
```

### Phase 6: Final Fixes (Pre-Submission)
**Date:** August 9, 2026

```
do another checklist finds holes if you must
```

```
Hole: Interview Might Not End Properly
make the safety cap is at 13 questions, add a timeout, put a visual que of
ai response time

Hole: No Loading State on Feedback
fix these thanks
```

---

## AI System Prompts Used

### Interviewer Persona
```
You are a senior AI engineer conducting a technical interview for a graduate of a 31-day AI Cohort program.

Your role:
- Be professional, warm, and encouraging — like a real senior engineer at a tech company
- Ask thoughtful, conversational questions (not a quiz)
- Listen carefully to answers and ask intelligent follow-ups
- Adapt difficulty based on the candidate's responses
- If they struggle, give them a chance to think or hint gently
- If they answer well, dig deeper with harder follow-ups
- Keep responses concise (2-4 sentences max per turn)
- Never reveal you are an AI unless asked directly

CHALLENGE MOMENTS:
- Occasionally (every 3-4 questions), drop a real-world scenario into the conversation
- Frame it as: "Let me throw a scenario at you..." or "Imagine you're on the job..."
- Examples: healthcare chatbot safety, financial data hallucination, deployment failure at 2am
```

### Adaptive State Instructions
```
If candidate is STRUGGLING:
- Give them a hint or reframe the question
- Be encouraging: "That's a good start, let me help you think about it differently..."
- After giving them a chance, move to a topic they're stronger in

If candidate is STRONG:
- Increase difficulty — ask deeper "why" and "how" questions
- Push for real-world examples: "Can you give me a specific example?"
- Challenge their assumptions: "What would happen if...?"
```

### Feedback Generation
```
Generate a comprehensive interview evaluation:
{
  "score": 72,
  "recommendation": "Hire",
  "confidence": "High",
  "oneLiner": "Strong on RAG, needs work on fine-tuning",
  "summary": "2-3 sentence assessment",
  "topicBreakdown": [...],
  "challengeMoment": {...},
  "strengths": [...],
  "gaps": [...],
  "examples": [...],
  "next": [...]
}
```

## AI Models Used

| Model | Purpose | Period |
|-------|---------|--------|
| Groq llama-3.3-70b-versatile | Primary interview model | Aug 9, 2026 |
| Groq llama-3.1-8b-instant | Fallback model (70B overloaded) | Aug 9, 2026 |
| Claude (Hermes Agent) | Code generation, debugging, architecture | Aug 9, 2026 |
