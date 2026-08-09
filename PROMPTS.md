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

```
can you add a delay like an interview before the ai respond and also can
you make like short and long convo like an interview the ai looks at your
answer and sometimes make you deep down on it if shallow and make the
convow flow realistically make it enjoyable process and like says based
on the user on like ill ask you 6 more question, to show the users how
many question left based on the convo
```

```
hmm maybe just add a 0.5 sec delay and also add the this to the prompt.md
and also take note i changed and delete some parts in there just put the
latest prompts in there
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

### Flow Rules (Realistic Interview)
```
FLOW RULES — Make it feel like a real interview:
- Sometimes go DEEP on an answer (ask "why", "how would you handle edge cases", "what if...")
- Sometimes move QUICKLY to the next topic if the answer is thorough
- Vary your response length: sometimes 1 sentence, sometimes 3-4 sentences
- If the answer is shallow or vague, PROBE: "Can you elaborate on that?" or "What specifically would you do?"
- If the answer is strong, acknowledge it briefly and move on
- Occasionally reference something they said earlier: "That connects to what you mentioned about X..."
- Be warm and human. Use phrases like "Interesting", "Good point", "Let me ask you about..."
- If you notice the candidate is struggling, say something like "No worries, let me rephrase that"
- Track how many questions remain and occasionally tell the user: "I have about X more questions" or "Let's cover a couple more topics"
- Do NOT ask "What do you know about X?" — instead ask scenario-based or "why" questions
- Do NOT end with [DONE] until you have covered at least 4 topics AND asked at least 8 questions
- When you ARE done, say a warm goodbye and append [DONE]
```

### Thinking Delay
```
// Frontend adds 0.5s delay before each API call
const thinkingDelay = () => new Promise(r => setTimeout(r, 500))
// Applied to: start interview, send message, end interview
// Simulates interviewer reading/thinking before responding
```

### Feedback Generation
```
Generate a comprehensive interview evaluation. Output ONLY the raw JSON:
{
  "score": 72,
  "recommendation": "Hire",
  "confidence": "High",
  "oneLiner": "Strong on RAG, needs work on fine-tuning",
  "summary": "2-3 sentence assessment",
  "topicBreakdown": [{"topic": "Day X: Topic", "rating": "Strong", "note": "observation"}],
  "challengeMoment": {"question": "...", "answer": "...", "quality": "Strong", "insight": "..."},
  "strengths": ["s1", "s2"],
  "gaps": ["g1", "g2"],
  "examples": [{"question": "asked", "answer": "said", "quality": "Strong"}],
  "next": ["n1", "n2"]
}

Scoring: 90-100 Exceptional, 75-89 Strong, 60-74 Adequate, 40-59 Developing, 0-39 Insufficient
Recommendation: "Strong Hire"(85+), "Hire"(70-84), "Maybe"(55-69), "No Hire"(<55)
Confidence: High/Medium/Low. oneLiner: max 15 words. Be specific, reference actual answers.
```

### Safety & Timeouts
```
- Safety cap: 13 questions maximum (auto-force end)
- API timeout: 30 seconds per LLM call (AbortController)
- Auto-fallback: llama-3.3-70b-versatile → llama-3.1-8b-instant on 503
- Retry: exponential backoff for 429 rate limits (2s, 4s)
```

## AI Models Used

| Model | Purpose | Period |
|-------|---------|--------|
| Groq llama-3.3-70b-versatile | Primary interview model | Aug 9, 2026 |
| Groq llama-3.1-8b-instant | Fallback model (70B overloaded) | Aug 9, 2026 |
| Claude (Hermes Agent) | Code generation, debugging, architecture | Aug 9, 2026 |
