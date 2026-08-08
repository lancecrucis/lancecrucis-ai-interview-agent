// /api/interview.js — Vercel Serverless Function
// Handles the interview conversation via Google Gemini API

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.5-flash';

const SYSTEM_PROMPT = `You are a senior AI engineer conducting a technical interview for a graduate of a 31-day AI Cohort program. 

Your role:
- Be professional, warm, and encouraging — like a real senior engineer at a tech company
- Ask thoughtful, conversational questions (not a quiz)
- Listen carefully to answers and ask intelligent follow-ups
- Adapt difficulty based on the candidate's responses
- If they struggle, give them a chance to think or hint gently
- If they answer well, dig deeper with harder follow-ups
- Keep responses concise (2-4 sentences max per turn)
- Never reveal you are an AI unless asked directly

Interview style:
- Start with a warm greeting and overview
- Mix conceptual questions ("What is X?") with practical questions ("How would you implement Y?")
- Ask "why" questions to test depth of understanding
- Reference specific things from their learning journey
- Make it feel like a real conversation, not an interrogation`;

async function callGemini(contents, systemInstruction = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function buildCandidateSummary(candidate) {
  const m = candidate.member;
  const missions = candidate.missions || [];
  const signals = candidate.signals || {};
  const passed = missions.filter(x => x.passed);
  const failed = missions.filter(x => x.passed === false);
  const skipped = missions.filter(x => x.skipped);

  return `## Candidate Profile
- Name: ${m.name}
- Role: ${m.jobRole}
- Experience: ${m.yearsExperience} years
- Education: ${m.education}

## Performance
- Missions completed: ${signals.missionsCompleted || passed.length}
- First-try passes: ${signals.missionsFirstTry || 0}
- Active days: ${signals.commitDays || 0}

## Passed (${passed.length})
${passed.map(x => `- Day ${x.day}: ${x.title} (${x.attempts} attempt${x.attempts > 1 ? 's' : ''})`).join('\n')}

## Failed (${failed.length})
${failed.map(x => `- Day ${x.day}: ${x.title} (${x.attempts} attempts)`).join('\n')}

## Skipped (${skipped.length})
${skipped.map(x => `- Day ${x.day}: ${x.title}`).join('\n')}`;
}

function getTopicsCovered(history) {
  const topics = [];
  for (const msg of history) {
    if (msg.role === 'user' && msg.text) {
      // Extract day numbers mentioned in user responses
      const matches = msg.text.match(/day\s+(\d+)/gi);
      if (matches) {
        matches.forEach(m => {
          const num = parseInt(m.replace(/day\s+/i, ''));
          if (!topics.includes(num)) topics.push(num);
        });
      }
    }
  }
  return topics;
}

function getConversationHistory(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.text }]
  }));
}

function buildStartPrompt(candidateSummary, selectedTopics) {
  const topicsList = selectedTopics.map(t =>
    `- Day ${t.day}: ${t.title} (${t.reason === 'skipped' ? 'SKIPPED' : t.reason === 'failed' ? 'FAILED' : t.reason === 'struggled' ? 'Multiple attempts' : 'Completed'})`
  ).join('\n');

  return `You are starting an interview with a candidate. Here is their profile:

${candidateSummary}

Focus areas for this interview (priority order):
${topicsList}

BEGIN the interview now. Start with a brief, warm welcome (2-3 sentences). Then ask your FIRST question — start with one of the priority topics. Do NOT list all topics you'll cover. Just naturally begin.

Remember: Ask ONE question at a time. Keep it conversational.`;
}

function buildFollowUpPrompt(history, candidateSummary, selectedTopics) {
  const conversationText = history.map(m =>
    `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`
  ).join('\n\n');

  const topicsList = selectedTopics.map(t =>
    `- Day ${t.day}: ${t.title}`
  ).join('\n');

  // Count how many AI messages mention each topic day
  const topicCoverage = {};
  selectedTopics.forEach(t => { topicCoverage[t.day] = 0; });
  history.filter(m => m.role === 'assistant').forEach(m => {
    selectedTopics.forEach(t => {
      if (m.text.includes(`Day ${t.day}`) || m.text.toLowerCase().includes(t.title.toLowerCase().split(' ')[0])) {
        topicCoverage[t.day]++;
      }
    });
  });

  // Find least-covered topics
  const sortedTopics = [...selectedTopics].sort((a, b) =>
    (topicCoverage[a.day] || 0) - (topicCoverage[b.day] || 0)
  );
  const nextTopics = sortedTopics.slice(0, 2).map(t => `Day ${t.day}: ${t.title}`).join(', ');

  return `You are conducting a technical interview. Here is the conversation so far:

${conversationText}

Candidate profile for reference:
${candidateSummary}

All topics to cover in this interview:
${topicsList}

Topics to focus on NEXT (least covered so far): ${nextTopics}

The candidate just answered your question. Based on their response:
1. If they answered well → acknowledge briefly, then ask about a NEW topic from the list above
2. If they answered partially → ask a clarifying question on the same topic
3. If they struggled → be encouraging, give a hint, then move to a different topic
4. If they gave a short answer → ask them to elaborate

CRITICAL RULES:
- Ask exactly ONE question
- Keep response to 2-3 sentences max (excluding the question)
- You MUST ask about different topics — do NOT stay on the same topic for more than 2 questions
- By the end, you should have covered at least 4 different topics from the list
- Be natural and conversational`;
}

function buildFeedbackPrompt(history, candidateSummary) {
  const conversationText = history.map(m =>
    `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`
  ).join('\n\n');

  return `The interview has concluded. Here is the full conversation:

${conversationText}

Candidate profile:
${candidateSummary}

Generate a structured interview feedback. Output ONLY the raw JSON object — no thinking, no markdown, no code fences:
{"summary":"2-3 sentence assessment","strengths":["s1","s2","s3"],"gaps":["g1","g2","g3"],"next":["n1","n2","n3"]}
Be specific. Reference actual topics. 3-5 items per array. START with the opening curly brace.{`;
}

async function callGeminiWithRetry(contents, systemInstruction = null, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callGemini(contents, systemInstruction);
    } catch (err) {
      const is429 = err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED');
      if (is429 && attempt < maxRetries) {
        // Extract retry delay from error or use exponential backoff
        const delayMatch = err.message.match(/retryDelay.*?(\d+)/);
        const delay = delayMatch ? parseInt(delayMatch[1]) * 1000 : (attempt + 1) * 2000;
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// Curriculum data (inline for serverless)
const curriculumDays = [
  { day: 1, title: "VS Code & Python Environment Setup", type: "SETUP" },
  { day: 2, title: "Local LLM & AI Coding Assistant Setup", type: "SETUP" },
  { day: 3, title: "First AI Project, React Frontend & GitHub", type: "BUILD" },
  { day: 4, title: "Reading & Processing Structured Data", type: "BUILD" },
  { day: 5, title: "Reading & Processing Unstructured Data", type: "BUILD" },
  { day: 6, title: "Building the Knowledge Base", type: "BUILD" },
  { day: 7, title: "Embeddings Explained", type: "AI_CORE" },
  { day: 8, title: "Vector Databases Overview", type: "BUILD" },
  { day: 9, title: "Building & Populating the Vector Database", type: "BUILD" },
  { day: 10, title: "The Retrieval & Matching Engine", type: "SHIP_IT" },
  { day: 11, title: "RAG End-to-End & LLM API Basics", type: "BUILD" },
  { day: 12, title: "Prompt Engineering Fundamentals", type: "LEARN" },
  { day: 13, title: "Advanced Prompting: Function Calling & Structured Outputs", type: "BUILD" },
  { day: 14, title: "Fine-Tuning: Concepts & When to Use It", type: "LEARN" },
  { day: 15, title: "Fine-Tuning: Hands-On with LoRA & QLoRA", type: "SHIP_IT" },
  { day: 16, title: "Chatbot Backend & API Integration", type: "BUILD" },
  { day: 17, title: "Chatbot Frontend Development", type: "BUILD" },
  { day: 18, title: "Full-Stack Integration & Streaming Responses", type: "BUILD" },
  { day: 19, title: "Response Formatting & Rich Outputs", type: "BUILD" },
  { day: 20, title: "Conversation Memory & Context Management", type: "SHIP_IT" },
  { day: 21, title: "Agentic Frameworks: LangChain Agents & Tool Use", type: "BUILD" },
  { day: 22, title: "Multi-Agent Orchestration", type: "BUILD" },
  { day: 23, title: "Model Context Protocol (MCP)", type: "BUILD" },
  { day: 24, title: "Agentic Chatbot Integration", type: "SHIP_IT" },
  { day: 25, title: "Chatbot Evaluation & Testing", type: "SHIP_IT" },
  { day: 26, title: "Performance Optimization & Cost Management", type: "OPTIMIZE" },
  { day: 27, title: "Security, Privacy & Guardrails", type: "BUILD" },
  { day: 28, title: "Docker & Kubernetes Deployment", type: "SHIP_IT" },
  { day: 29, title: "Monitoring, Logging & Observability", type: "BUILD" },
  { day: 30, title: "Production Readiness & Final Testing", type: "SHIP_IT" },
  { day: 31, title: "Capstone Project & Final Demo", type: "CAPSTONE" },
];

function selectTopics(candidate, numTopics = 6) {
  const missions = candidate.missions || [];
  const missionMap = {};
  missions.forEach(m => { missionMap[m.day] = m; });

  const scoredDays = curriculumDays
    .filter(d => d.type !== 'SETUP' && d.type !== 'CAPSTONE')
    .map(d => {
      const mission = missionMap[d.day];
      let score = 0;
      let reason = '';

      if (!mission) { score = 8; reason = 'not_attempted'; }
      else if (mission.skipped) { score = 9; reason = 'skipped'; }
      else if (!mission.passed) { score = 10; reason = 'failed'; }
      else if (mission.attempts >= 4) { score = 7; reason = 'struggled'; }
      else if (mission.attempts >= 2) { score = 5; reason = 'moderate'; }
      else { score = 3; reason = 'strong'; }

      return { day: d.day, title: d.title, score, reason };
    });

  scoredDays.sort((a, b) => b.score - a.score);
  return scoredDays.slice(0, numTopics);
}

const MIN_QUESTIONS = 8;
const MAX_QUESTIONS = 12;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { candidate, message, history = [], selectedTopics = [] } = req.body;

    if (!candidate) {
      return res.status(400).json({ error: 'candidate is required' });
    }

    const candidateSummary = buildCandidateSummary(candidate);
    const topics = selectedTopics.length > 0 ? selectedTopics : selectTopics(candidate);

    // Count user responses (actual interview questions answered)
    const userResponseCount = history.filter(m => m.role === 'user').length;

    // Check if interview is complete
    if (userResponseCount >= MIN_QUESTIONS && message === '__END__') {
      // Generate feedback
      const feedbackPrompt = buildFeedbackPrompt(history, candidateSummary);
      const geminiHistory = getConversationHistory(history);

      const feedbackText = await callGeminiWithRetry([
        ...geminiHistory,
        { role: 'user', parts: [{ text: feedbackPrompt }] }
      ]);

      let feedback;
      try {
        // Try to extract JSON from the response
        const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
        feedback = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          summary: feedbackText,
          strengths: [],
          gaps: [],
          next: []
        };
      } catch {
        feedback = {
          summary: feedbackText,
          strengths: [],
          gaps: [],
          next: []
        };
      }

      return res.status(200).json({
        reply: 'Thank you for your time today. It was a pleasure interviewing you. Here is your feedback:',
        done: true,
        feedback
      });
    }

    // Build conversation for Gemini
    const geminiHistory = getConversationHistory(history);

    if (history.length === 0) {
      // First message — start the interview
      const startPrompt = buildStartPrompt(candidateSummary, topics);
      const reply = await callGeminiWithRetry([
        { role: 'user', parts: [{ text: startPrompt }] }
      ], SYSTEM_PROMPT);

      return res.status(200).json({
        reply: reply.trim(),
        done: false,
        selectedTopics: topics
      });
    }

    // Follow-up — continue conversation
    const followUpPrompt = buildFollowUpPrompt(history, candidateSummary, topics);

    // Add the prompt as the last user message context
    const contents = [
      ...geminiHistory.slice(0, -1), // all but last
      {
        role: 'user',
        parts: [{ text: `${followUpPrompt}\n\n---\nIMPORTANT: Your response must be ONLY the next interview message. Do NOT include any JSON, labels, or formatting. Just speak naturally as the interviewer.` }]
      }
    ];

    const reply = await callGeminiWithRetry(contents, SYSTEM_PROMPT);

    // Check if we should suggest ending
    const shouldEnd = userResponseCount + 1 >= MAX_QUESTIONS;

    return res.status(200).json({
      reply: reply.trim(),
      done: false,
      questionCount: userResponseCount + 1,
      shouldEnd
    });

  } catch (error) {
    console.error('Interview API error:', error);
    return res.status(500).json({
      error: 'Interview processing failed',
      message: error.message
    });
  }
}
