# AI Interview Agent

An AI-powered technical interview agent that conducts personalized, multi-turn interviews for graduates of a 31-day AI Cohort program.

**Live Demo:** [lancecrucis-ai-interview-agent-lcag.vercel.app](https://lancecrucis-ai-interview-agent-lcag.vercel.app)

## What It Does

The AI Interview Agent analyzes a candidate's learning journey and conducts a realistic technical interview that:

- **Adapts** to the candidate's strengths and weaknesses in real-time
- **Drops challenge moments** — real-world scenarios mid-interview
- **Asks** intelligent follow-ups based on answer quality
- **Covers** multiple curriculum topics (embeddings, RAG, agents, MCP, deployment, etc.)
- **Ends automatically** when the AI has gathered enough signal
- **Generates rich feedback** with score, recommendation, topic breakdown, and examples

## Architecture

```
┌──────────────┐     POST /api/interview     ┌──────────────────┐
│              │ ───────────────────────────▶ │                  │
│  React App   │                              │   Vercel Server  │
│  (Frontend)  │ ◀─────────────────────────── │   (Serverless)   │
│              │       { reply, done }        │                  │
└──────────────┘                              └────────┬─────────┘
                                                       │
                                            ┌──────────▼──────────┐
                                            │  Groq API           │
                                            │  llama-3.3-70b      │
                                            │  (falls back to     │
                                            │   llama-3.1-8b)     │
                                            └─────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Vercel Serverless Functions |
| LLM | Groq (llama-3.3-70b-versatile with auto-fallback to llama-3.1-8b-instant) |
| Styling | Custom CSS (Light + Dark theme) |
| Hosting | Vercel |

## Quick Start

### Prerequisites
- Node.js 18+
- Groq API key ([Get one free](https://console.groq.com))

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/lancecrucis/lancecrucis-ai-interview-agent.git
cd lancecrucis-ai-interview-agent
```

2. Install dependencies:
```bash
cd frontend && npm install
```

3. Create `.env` file in the root:
```
GROQ_API_KEY=your_api_key_here
```

4. Start the dev servers:
```bash
# Terminal 1 - API Server
node dev-server.js

# Terminal 2 - Frontend
cd frontend && npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173)

## Features

### Adaptive Interview Engine
- **Real-time state tracking** — AI detects if candidate is struggling or excelling
- **Dynamic difficulty** — adjusts from warmup → foundational → intermediate → advanced
- **Challenge moments** — drops real-world scenarios at question 3, 7, and 11
- **Automatic ending** — AI ends the interview when satisfied with coverage

### Smart Topic Selection
- Prioritizes failed and skipped missions from the curriculum
- Rotates across topics to ensure broad coverage
- Adapts question difficulty based on candidate responses

### Rich Feedback
- **Score** (0-100) with color-coded circle
- **Recommendation** — Strong Hire / Hire / Maybe / No Hire
- **Confidence level** — High / Medium / Low
- **One-liner summary** — quick assessment at a glance
- **Topic breakdown** — per-topic ratings (Strong/Solid/Weak) with notes
- **Challenge moment** — how candidate handled the real-world scenario
- **Key moments** — specific Q&A examples with quality tags
- **Strengths, gaps, and next steps** — actionable recommendations

### Candidate Picker
- **Search** by name or role
- **Sort** by name, experience, missions completed, first-try rate, or education
- **Quick filters** — Top Performers, Needs Help, Skipped Content, No Attempts
- **Mission progress bar** — visual breakdown of passed/failed/skipped

### UI
- Light and dark theme toggle
- Responsive design
- Minimalist, professional aesthetic

## Project Structure

```
ai-interview-agent/
├── api/
│   └── interview.js          # Vercel serverless function
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app
│   │   ├── App.css            # All styles + themes
│   │   ├── components/
│   │   │   ├── CandidatePicker.jsx  # Sort/filter/search
│   │   │   ├── ChatWindow.jsx       # Chat interface
│   │   │   └── FeedbackCard.jsx     # Rich feedback display
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── dev-server.js              # Local dev server (Groq backend)
├── .env                       # API keys (not committed)
├── vercel.json                # Vercel deployment config
├── PROMPTS.md                 # AI usage log
└── README.md
```

## API

### POST /api/interview

**Start Interview:**
```json
{
  "candidate": { ... },
  "message": "",
  "history": []
}
```

**Continue Interview:**
```json
{
  "candidate": { ... },
  "message": "candidate's answer",
  "history": [...],
  "selectedTopics": [...]
}
```

**End Interview (manual):**
```json
{
  "candidate": { ... },
  "message": "__END__",
  "history": [...],
  "selectedTopics": [...]
}
```

**Response (during interview):**
```json
{
  "reply": "interviewer's message",
  "done": false,
  "questionCount": 5,
  "shouldEnd": false,
  "state": {
    "difficulty": "intermediate",
    "isStruggling": false,
    "isStrong": true,
    "shouldChallenge": false
  }
}
```

**Response (interview complete):**
```json
{
  "reply": "closing message",
  "done": true,
  "questionCount": 10,
  "feedback": {
    "score": 78,
    "recommendation": "Hire",
    "confidence": "High",
    "oneLiner": "Strong on RAG, needs work on fine-tuning",
    "summary": "...",
    "topicBreakdown": [...],
    "challengeMoment": { "question": "...", "answer": "...", "quality": "Strong", "insight": "..." },
    "strengths": [...],
    "gaps": [...],
    "examples": [...],
    "next": [...]
  }
}
```

## Auto-Fallback

The system tries `llama-3.3-70b-versatile` (best quality) first. If it's overloaded (503), it automatically falls back to `llama-3.1-8b-instant` (always available). Rate limits (429) trigger retry with exponential backoff.

## License

MIT
