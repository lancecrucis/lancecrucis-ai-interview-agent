# Technical Specification — AI Interview Agent

## Overview

An AI-powered technical interview system that conducts personalized, multi-turn interviews for graduates of a 31-day AI Cohort program. The system adapts in real-time, drops challenge scenarios, and generates structured feedback with scoring.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│                                                         │
│  CandidatePicker ──▶ ChatWindow ──▶ FeedbackCard        │
│  (sort/filter)       (adaptive)     (rich feedback)     │
│                                                         │
│  State: theme, conversation history, selectedTopics     │
└──────────────────────────┬──────────────────────────────┘
                           │ POST /api/interview
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 BACKEND (Vercel Serverless)              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Topic        │  │ Adaptive     │  │ Feedback     │  │
│  │ Selection    │  │ State Engine │  │ Generator    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └─────────────────┼─────────────────┘           │
│                           ▼                             │
│                  ┌────────────────┐                     │
│                  │ LLM Router     │                     │
│                  │ (auto-fallback)│                     │
│                  └───────┬────────┘                     │
└──────────────────────────┼──────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌────────────────┐       ┌────────────────┐
     │ Groq 70B       │       │ Groq 8B        │
     │ (primary)      │──────▶│ (fallback)     │
     └────────────────┘ 503   └────────────────┘
```

## Core Components

### 1. Topic Selection Engine

Selects 6 topics for each interview based on candidate's curriculum performance.

**Scoring priority:**
| Priority | Condition | Score |
|----------|-----------|-------|
| 1 | Failed mission | 10 |
| 2 | Skipped mission | 9 |
| 3 | Not attempted | 8 |
| 4 | Struggled (4+ attempts) | 7 |
| 5 | Moderate (2-3 attempts) | 5 |
| 6 | Strong (1 attempt) | 3 |

Higher score = higher priority for interview questions.

### 2. Adaptive State Engine

Tracks conversation state in real-time and adjusts interview behavior.

**State properties:**
- `difficulty`: warmup → foundational → intermediate → advanced
- `isStruggling`: detected via short answers + struggle keywords
- `isStrong`: detected via long answers + strong keywords
- `shouldChallenge`: triggers at question 3, 7, and 11

**Detection heuristics:**
```
Struggle signals: "idk", "don't know", "not sure", "umm", "uhh", "maybe"
  + answer length < 150 characters

Strong signals: "definitely", "exactly", "specifically", "for example", "because"
  + answer length > 100 characters
```

**Adaptive behaviors:**
| State | Behavior |
|-------|----------|
| Struggling | Give hints, reframe questions, move to strengths |
| Strong | Increase difficulty, probe deeper, challenge assumptions |
| Challenge | Drop real-world scenario mid-interview |
| Normal | Continue planned topic rotation |

### 3. Challenge Moments

Real-world scenarios dropped into the interview to test practical thinking.

**Trigger points:** Questions 3, 7, and 11

**Scenario types:**
- Healthcare chatbot refusing dangerous medical advice
- RAG system retrieving incorrect legal documents
- Fine-tuned model hallucinating in production
- Agent framework stuck in infinite loop
- Deployment failure at 2am

**Format:** "Let me throw a scenario at you..." followed by the scenario.

### 4. Auto-Ending

The AI signals `[DONE]` when:
- At least 4 different topics covered
- At least 8 questions asked
- AI is satisfied with coverage

Fallback: Manual "End Interview" button (after 10 questions) or auto-force at 15 questions.

### 5. Rich Feedback Generator

Produces structured JSON feedback after interview completion.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `score` | 0-100 | Overall performance score |
| `recommendation` | enum | Strong Hire / Hire / Maybe / No Hire |
| `confidence` | enum | High / Medium / Low |
| `oneLiner` | string | One-sentence summary (max 15 words) |
| `summary` | string | 2-3 sentence assessment |
| `topicBreakdown` | array | Per-topic rating (Strong/Solid/Weak) with notes |
| `challengeMoment` | object | Scenario Q&A with quality and insight |
| `strengths` | array | 2-4 specific strengths |
| `gaps` | array | 2-3 areas for improvement |
| `examples` | array | Key Q&A moments with quality tags |
| `next` | array | 2-3 actionable recommendations |

**Scoring rubric:**
| Range | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Exceptional | Deep understanding, teaches concepts |
| 75-89 | Strong | Solid answers, minor gaps |
| 60-74 | Adequate | Basic understanding, needs mentorship |
| 40-59 | Developing | Partial understanding, needs training |
| 0-39 | Insufficient | Unable to demonstrate understanding |

### 6. LLM Router with Auto-Fallback

```
Request → Try Primary (70B)
              ↓
         Success? → Return response
              ↓ (503/overloaded)
         Try Fallback (8B)
              ↓
         Success? → Return response
              ↓ (429/rate limit)
         Retry with exponential backoff (2s, 4s)
```

## API Specification

### POST /api/interview

**Request body:**
```json
{
  "candidate": { "member": {...}, "missions": [...], "signals": {...} },
  "message": "" | "answer" | "__END__",
  "history": [{ "role": "user"|"assistant", "text": "..." }],
  "selectedTopics": [{ "day": 7, "title": "...", "reason": "..." }]
}
```

**Response (during interview):**
```json
{
  "reply": "Interviewer's message",
  "done": false,
  "questionCount": 5,
  "shouldEnd": false,
  "selectedTopics": [...],
  "state": {
    "difficulty": "intermediate",
    "questionCount": 5,
    "isStruggling": false,
    "isStrong": true,
    "shouldChallenge": false
  }
}
```

**Response (interview complete):**
```json
{
  "reply": "Closing message",
  "done": true,
  "questionCount": 10,
  "feedback": { "score": 78, "recommendation": "Hire", ... }
}
```

## Candidate Data Model

```json
{
  "member": {
    "id": "CAND-001",
    "name": "Liam Nguyen",
    "jobRole": "AI Engineer",
    "yearsExperience": 3,
    "education": "Self-taught + AI Cohort"
  },
  "missions": [
    { "day": 4, "title": "Reading & Processing Structured Data", "passed": true, "attempts": 1 }
  ],
  "signals": {
    "missionsCompleted": 25,
    "missionsFirstTry": 18,
    "commitDays": 22
  }
}
```

## Curriculum Topics

31-day AI Cohort covering:
- **Days 1-3:** Setup (VS Code, Python, LLM, GitHub)
- **Days 4-6:** Data processing & knowledge base
- **Days 7-9:** Embeddings & vector databases
- **Days 10-13:** RAG, prompt engineering, structured outputs
- **Days 14-15:** Fine-tuning (LoRA, QLoRA)
- **Days 16-20:** Chatbot (backend, frontend, streaming, memory)
- **Days 21-24:** Agents (LangChain, multi-agent, MCP)
- **Days 25-27:** Testing, optimization, security
- **Days 28-30:** Deployment (Docker, Kubernetes, monitoring)
- **Day 31:** Capstone project

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 19 + Vite | SPA with client-side state |
| Backend | Vercel Serverless | API endpoints |
| LLM | Groq (llama-3.3-70b / llama-3.1-8b) | Interview conversations + feedback |
| Styling | Custom CSS | Light/dark themes, minimalist design |
| Fonts | Geist Sans + Mono | Typography |
| Hosting | Vercel | Deployment |
| Version Control | Git + GitHub | Source code |
