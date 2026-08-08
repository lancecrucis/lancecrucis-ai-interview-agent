# AI Usage Log — AI Interview Agent

This document tracks all AI-assisted prompts and code generation used during the development of this project.

---

## Project: AI Interview Agent

**Developer:** Lance Christian C. Crucis  
**Date:** August 9, 2026  
**AI Tools Used:** Hermes Agent (Nous Research), Google Gemini 3.5 Flash

---

## Prompts & Interactions

### 1. Project Setup
**Prompt:** "Can you check the folder in my desktop called ai interview agent"  
**AI Action:** Scanned the project folder, read all files (candidates.json, curriculum.json, problem statement, technical spec), provided a full project overview and architecture recommendations.

### 2. Architecture Planning
**Prompt:** "like how, you will build it while i open it on vs code? and also what is the plan what tech stack do we use for this"  
**AI Action:** Recommended tech stack (Python FastAPI + React + OpenAI/Gemini), designed system architecture, created project structure plan.

### 3. LLM Selection
**Prompt:** "but can you tell me what you will do first before you build"  
**AI Action:** Created detailed 9-step build plan with time estimates for each phase.

### 4. Code Generation — Interview Engine
**AI Action:** Generated `src/lib/interviewEngine.js` — core logic for topic selection, candidate analysis, and interview state management. Includes:
- Topic scoring algorithm (failed > skipped > struggled > moderate > strong)
- Module diversity constraint (max 2 topics per module)
- Candidate summary builder

### 5. Code Generation — System Prompts
**AI Action:** Generated `src/lib/prompts.js` — all LLM prompts for the interviewer persona, start prompt, follow-up prompt, and feedback generation prompt.

### 6. Code Generation — API Endpoint
**AI Action:** Generated `api/interview.js` — Vercel serverless function handling the full interview flow:
- POST /api/interview endpoint
- Gemini API integration (raw HTTP calls)
- Start, follow-up, and feedback generation flows
- CORS handling

### 7. Code Generation — Frontend Components
**AI Action:** Generated all React components:
- `CandidatePicker.jsx` — Grid of 20 candidates with search, stats, color-coded performance
- `ChatWindow.jsx` — Chat interface with typing indicators, topic chips, end interview button
- `FeedbackCard.jsx` — Structured feedback display with summary, strengths, gaps, next steps

### 8. Code Generation — Styling
**AI Action:** Generated `App.css` — Complete dark theme styling with:
- CSS custom properties for theming
- Responsive grid layout
- Chat bubble design
- Typing animation
- Mobile-responsive breakpoints

### 9. Code Generation — Local Dev Server
**AI Action:** Generated `dev-server.js` — Complete local development server that mirrors the Vercel API, allowing testing without deployment.

### 10. API Key Troubleshooting
**Prompt:** User provided Gemini API key  
**AI Action:** Tested the API key, discovered quota issues with gemini-2.0-flash, identified working model (gemini-3.5-flash), updated all references.

### 11. Bug Fixes
**AI Action:** 
- Fixed START button not triggering interview start (__START__ handling)
- Added topic rotation logic to ensure questions cover 4+ curriculum days
- Fixed feedback JSON parsing (model was outputting thinking text)
- Updated prompts to prevent model from including thinking in responses

### 12. Project Evaluation
**Prompt:** "based on the criteria of the hackathon and rules judge them"  
**AI Action:** Conducted thorough self-evaluation against hackathon rubric, identified 8 critical gaps, created prioritized fix list.

---

## AI-Generated Code Summary

| File | Lines | Description |
|------|-------|-------------|
| `api/interview.js` | ~380 | Vercel serverless API endpoint |
| `dev-server.js` | ~165 | Local development server |
| `src/lib/interviewEngine.js` | ~120 | Core interview logic |
| `src/lib/prompts.js` | ~100 | LLM prompt templates |
| `src/App.jsx` | ~155 | Main React application |
| `src/components/CandidatePicker.jsx` | ~90 | Candidate selection UI |
| `src/components/ChatWindow.jsx` | ~115 | Chat interface |
| `src/components/FeedbackCard.jsx` | ~70 | Feedback display |
| `src/App.css` | ~350 | Complete styling |

**Total AI-Assisted Code: ~1,545 lines**

---

## Manual Edits & Customization

- Candidate data structure adapted from provided JSON
- Curriculum topics mapped and scored for interview relevance
- Topic rotation algorithm designed for maximum coverage
- Feedback format aligned with hackathon requirements
- UI/UX decisions (dark theme, chat bubbles, responsive layout)

---

## AI Model Used for Interviews (Production)

- **Model:** Google Gemini 3.5 Flash
- **Temperature:** 0.7
- **Max Tokens:** 1024
- **Purpose:** Generate interview questions, follow-ups, and feedback
