# AI Usage Log

This document tracks AI prompts used during development.

## Interview System Prompts

### System Prompt (Interviewer Persona)
```
You are a senior AI engineer conducting a technical interview for a graduate of a 31-day AI Cohort program.
Be professional, warm, and encouraging. Ask thoughtful conversational questions.
Listen carefully and ask intelligent follow-ups. Keep responses concise (2-4 sentences max).
Mix conceptual and practical questions. Ask "why" questions to test depth.
```

### Start Prompt
```
Interview a candidate with their profile and focus areas (priority topics based on skipped/failed missions).
Start with a brief warm welcome. Then ask your FIRST question on a priority topic. ONE question at a time.
```

### Follow-Up Prompt
```
Technical interview in progress. Based on their answer: acknowledge if good then move to a NEW topic.
Probe if partial. Encourage if struggling. Ask ONE question. 2-3 sentences max.
Cover different topics — no more than 2 questions on the same topic.
```

### Feedback Prompt
```
Interview concluded. Return ONLY a JSON object:
{"summary":"assessment","strengths":["s1","s2"],"gaps":["g1","g2"],"next":["n1","n2"]}
Be specific. Reference actual topics. 3-5 items per array.
```

## Development Prompts Used

### Project Architecture
- "Build an AI Interview Agent web app with React frontend and Node.js serverless backend"
- "Use Google Gemini API for LLM calls, deploy to Vercel"
- "Create interview engine with topic selection, follow-up generation, and structured feedback"

### Frontend Components
- "Build candidate picker with search, chat window with typing indicator, feedback card"
- "Add dark mode toggle with CSS custom properties"
- "Minimalist white theme inspired by Mobbin/Linear design"

### Bug Fixes
- "Add retry with exponential backoff for Gemini 429 rate limits"
- "Show user-friendly error messages for API failures"
- "Fix dark mode button colors using theme-aware CSS variables"

## AI Models Used
- **Google Gemini 3.5 Flash** — Interview conversations and feedback generation
- **Claude (Hermes Agent)** — Code generation, debugging, and architecture decisions
