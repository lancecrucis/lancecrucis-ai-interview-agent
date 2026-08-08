# 🎓 AI Interview Agent

An AI-powered technical interview agent that conducts personalized, multi-turn interviews for graduates of a 31-day AI Cohort program.

## 🌐 Live Demo

[https://ai-interview-agent.vercel.app](https://ai-interview-agent.vercel.app)

## 📋 What It Does

The AI Interview Agent analyzes a candidate's learning journey through the AI Cohort and conducts a realistic technical interview that:

- **Adapts** to the candidate's strengths and weaknesses
- **Asks** intelligent follow-up questions based on responses
- **Covers** multiple curriculum topics (embeddings, RAG, agents, MCP, deployment, etc.)
- **Provides** structured feedback with strengths, gaps, and recommendations

## 🏗️ Architecture

```
┌──────────────┐     POST /api/interview     ┌──────────────────┐
│              │ ───────────────────────────▶ │                  │
│  React App   │                              │   Vercel Server  │
│  (Frontend)  │ ◀─────────────────────────── │   (Serverless)   │
│              │       { reply, done }        │                  │
└──────────────┘                              └────────┬─────────┘
                                                       │
                                            ┌──────────▼──────────┐
                                            │  Google Gemini      │
                                            │  3.5 Flash          │
                                            └─────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Vercel Serverless Functions |
| LLM | Google Gemini 3.5 Flash |
| Styling | Custom CSS (Dark Theme) |
| Hosting | Vercel |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google Gemini API key ([Get one free](https://aistudio.google.com/apikey))

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/lancecrucis/ai-interview-agent.git
cd ai-interview-agent
```

2. Install dependencies:
```bash
cd frontend && npm install
```

3. Create `.env` file in the root:
```
GEMINI_API_KEY=your_api_key_here
```

4. Start the dev servers:
```bash
# Terminal 1 - API Server
node dev-server.js

# Terminal 2 - Frontend
cd frontend && npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173)

## 📁 Project Structure

```
ai-interview-agent/
├── api/
│   └── interview.js          # Vercel serverless function
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app
│   │   ├── components/
│   │   │   ├── CandidatePicker.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   └── FeedbackCard.jsx
│   │   ├── data/
│   │   │   ├── candidates.json
│   │   │   └── curriculum.json
│   │   └── lib/
│   │       ├── interviewEngine.js
│   │       └── prompts.js
│   └── package.json
├── dev-server.js              # Local dev server
├── vercel.json                # Vercel config
├── PROMPTS.md                 # AI usage log
└── README.md
```

## 🔌 API

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

**End Interview:**
```json
{
  "candidate": { ... },
  "message": "__END__",
  "history": [...],
  "selectedTopics": [...]
}
```

**Response:**
```json
{
  "reply": "interviewer's message",
  "done": false,
  "selectedTopics": [...]
}
```

## 📊 Features

- ✅ 20 synthetic candidate profiles with varied backgrounds
- ✅ 31-day curriculum with 8 modules
- ✅ Smart topic selection based on candidate performance
- ✅ Topic rotation ensuring coverage of 4+ curriculum days
- ✅ Context-aware follow-up questions
- ✅ Structured feedback (summary, strengths, gaps, next steps)
- ✅ Responsive dark theme UI
- ✅ Free to run (Google Gemini free tier)

## 📄 License

MIT
