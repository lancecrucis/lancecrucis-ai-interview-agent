// dev-server.js — Local development server (Groq backend)
import http from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4567;

let GROQ_API_KEY = process.env.GROQ_API_KEY;
try {
  const envContent = readFileSync(join(__dirname, '.env'), 'utf8');
  const match = envContent.match(/GROQ_API_KEY=(.+)/);
  if (match) GROQ_API_KEY = match[1].trim();
} catch {}

if (!GROQ_API_KEY) { console.error('No GROQ_API_KEY found'); process.exit(1); }
console.log('Groq API key loaded');

const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are a senior AI engineer conducting a technical interview for a graduate of a 31-day AI Cohort program. Be professional, warm, and encouraging. Ask thoughtful conversational questions, listen carefully, and ask intelligent follow-ups. Keep responses concise (2-4 sentences max). Mix conceptual and practical questions. Ask "why" questions to test depth.`;

const curriculumDays = [
  { day: 4, title: "Reading & Processing Structured Data", type: "BUILD" },
  { day: 5, title: "Reading & Processing Unstructured Data", type: "BUILD" },
  { day: 7, title: "Embeddings Explained", type: "AI_CORE" },
  { day: 8, title: "Vector Databases Overview", type: "BUILD" },
  { day: 10, title: "The Retrieval & Matching Engine", type: "SHIP_IT" },
  { day: 11, title: "RAG End-to-End & LLM API Basics", type: "BUILD" },
  { day: 12, title: "Prompt Engineering Fundamentals", type: "LEARN" },
  { day: 13, title: "Advanced Prompting: Function Calling & Structured Outputs", type: "BUILD" },
  { day: 16, title: "Chatbot Backend & API Integration", type: "BUILD" },
  { day: 21, title: "Agentic Frameworks: LangChain Agents & Tool Use", type: "BUILD" },
  { day: 22, title: "Multi-Agent Orchestration", type: "BUILD" },
  { day: 23, title: "Model Context Protocol (MCP)", type: "BUILD" },
  { day: 27, title: "Security, Privacy & Guardrails", type: "BUILD" },
  { day: 28, title: "Docker & Kubernetes Deployment", type: "SHIP_IT" },
  { day: 29, title: "Monitoring, Logging & Observability", type: "BUILD" },
  { day: 20, title: "Conversation Memory & Context Management", type: "SHIP_IT" },
];

function selectTopics(candidate, n = 6) {
  const missionMap = {};
  (candidate.missions || []).forEach(m => { missionMap[m.day] = m; });
  const scored = curriculumDays.map(d => {
    const m = missionMap[d.day];
    let score = 0, reason = '';
    if (!m) { score = 8; reason = 'not_attempted'; }
    else if (m.skipped) { score = 9; reason = 'skipped'; }
    else if (!m.passed) { score = 10; reason = 'failed'; }
    else if (m.attempts >= 4) { score = 7; reason = 'struggled'; }
    else if (m.attempts >= 2) { score = 5; reason = 'moderate'; }
    else { score = 3; reason = 'strong'; }
    return { day: d.day, title: d.title, score, reason };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}

function buildCandidateSummary(c) {
  const m = c.member, missions = c.missions || [], s = c.signals || {};
  const passed = missions.filter(x => x.passed), failed = missions.filter(x => x.passed === false), skipped = missions.filter(x => x.skipped);
  return `Candidate: ${m.name}, ${m.jobRole}, ${m.yearsExperience}y exp, ${m.education}\nCompleted: ${s.missionsCompleted || passed.length}, First-try: ${s.missionsFirstTry || 0}\nPassed: ${passed.map(x => `Day ${x.day}: ${x.title}`).join(', ')}\nFailed: ${failed.map(x => `Day ${x.day}: ${x.title}`).join(', ')}\nSkipped: ${skipped.map(x => `Day ${x.day}: ${x.title}`).join(', ')}`;
}

function buildStartPrompt(summary, topics) {
  const list = topics.map(t => `- Day ${t.day}: ${t.title} (${t.reason})`).join('\n');
  return `Interview a candidate.\n\n${summary}\n\nFocus areas:\n${list}\n\nStart with a brief warm welcome (2 sentences). Then ask your FIRST question on one of the priority topics. ONE question at a time.`;
}

function buildFollowUpPrompt(history, summary, topics) {
  const conv = history.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`).join('\n\n');
  const topicList = topics.map(t => `- Day ${t.day}: ${t.title}`).join('\n');
  const coverage = {};
  topics.forEach(t => { coverage[t.day] = 0; });
  history.filter(m => m.role === 'assistant').forEach(m => {
    topics.forEach(t => {
      if (m.text.includes(`Day ${t.day}`) || m.text.toLowerCase().includes(t.title.toLowerCase().split(' ')[0])) {
        coverage[t.day]++;
      }
    });
  });
  const sorted = [...topics].sort((a, b) => (coverage[a.day] || 0) - (coverage[b.day] || 0));
  const next = sorted.slice(0, 2).map(t => `Day ${t.day}: ${t.title}`).join(', ');
  const coveredCount = Object.values(coverage).filter(c => c > 0).length;
  const userCount = history.filter(m => m.role === 'user').length;

  return `Technical interview in progress.\n\n${conv}\n\nCandidate: ${summary}\n\nTopics to cover:\n${topicList}\n\nTopics covered: ${coveredCount} of ${topics.length}. Questions asked: ${userCount}\n\nFocus NEXT on: ${next}\n\nBased on their answer: acknowledge if good then move to a NEW topic. Probe if partial. Encourage if struggling. Ask ONE question. 2-3 sentences max.\n\nENDING: When you have covered at least 4 topics AND asked at least 8 questions, end with a warm closing and append [DONE] at the very end of your message. Do NOT say [DONE] until you have covered at least 4 topics and asked at least 8 questions.`;
}

function buildFeedbackPrompt(history, summary, topics) {
  const conv = history.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`).join('\n\n');
  const topicsList = topics.map(t => `- Day ${t.day}: ${t.title}`).join('\n');
  return `Interview concluded.\n\n${conv}\n\nCandidate: ${summary}\n\nTopics covered:\n${topicsList}\n\nReturn ONLY a raw JSON object (no markdown, no code fences):\n{"score":72,"recommendation":"Hire","summary":"2-3 sentence assessment","topicBreakdown":[{"topic":"Day X: Topic Name","rating":"Strong","note":"observation"}],"strengths":["s1","s2"],"gaps":["g1","g2"],"examples":[{"question":"what was asked","answer":"what they said","quality":"Strong"}],"next":["n1","n2"]}\n\nScoring: 90-100 Exceptional, 75-89 Strong, 60-74 Adequate, 40-59 Developing, 0-39 Insufficient\nRecommendation: "Strong Hire" (85+), "Hire" (70-84), "Maybe" (55-69), "No Hire" (below 55)\nRatings: Strong/Solid/Weak. Quality: Strong/Weak/Partial. Be specific, reference actual answers.`;
}

function parseFeedback(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: parsed.score || 50,
        recommendation: parsed.recommendation || 'Maybe',
        summary: parsed.summary || '',
        topicBreakdown: parsed.topicBreakdown || [],
        strengths: parsed.strengths || [],
        gaps: parsed.gaps || [],
        examples: parsed.examples || [],
        next: parsed.next || [],
      };
    }
  } catch {}
  return { score: 50, recommendation: 'Maybe', summary: text, topicBreakdown: [], strengths: [], gaps: [], examples: [], next: [] };
}

async function callLLM(messages, model = PRIMARY_MODEL) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callLLMWithRetry(messages, maxRetries = 2) {
  // Try primary model first
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callLLM(messages, PRIMARY_MODEL);
    } catch (err) {
      const isOverloaded = err.message.includes('503') || err.message.includes('over capacity') || err.message.includes('502');
      const isRateLimit = err.message.includes('429') || err.message.includes('RATE_LIMITED');

      if (isOverloaded) {
        console.log(`Primary model (${PRIMARY_MODEL}) overloaded, falling back to ${FALLBACK_MODEL}`);
        break;
      }
      if (isRateLimit && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw err;
    }
  }

  // Fallback to instant model
  console.log(`Using fallback model: ${FALLBACK_MODEL}`);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callLLM(messages, FALLBACK_MODEL);
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw err;
    }
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  if (req.url !== '/api/interview' || req.method !== 'POST') { res.writeHead(404); res.end('Not found'); return; }

  let body = '';
  for await (const chunk of req) body += chunk;

  try {
    const { candidate, message, history = [], selectedTopics = [] } = JSON.parse(body);
    const summary = buildCandidateSummary(candidate);
    const topics = selectedTopics.length > 0 ? selectedTopics : selectTopics(candidate);
    const userCount = history.filter(m => m.role === 'user').length;

    // Manual end
    if (message === '__END__') {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        { role: 'user', content: buildFeedbackPrompt(history, summary, topics) }
      ];
      const fb = await callLLMWithRetry(messages);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: 'Thank you for your time. Here is your feedback:', done: true, feedback: parseFeedback(fb) }));
      return;
    }

    // Start
    if (history.length === 0) {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildStartPrompt(summary, topics) }
      ];
      const reply = await callLLMWithRetry(messages);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: reply.trim(), done: false, selectedTopics: topics }));
      return;
    }

    // Follow-up
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: buildFollowUpPrompt(history, summary, topics) }
    ];
    let reply = await callLLMWithRetry(messages);

    // Check if AI signaled done
    const isDone = reply.includes('[DONE]');
    if (isDone) {
      reply = reply.replace('[DONE]', '').trim();
      const fbMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        { role: 'assistant', content: reply },
        { role: 'user', content: buildFeedbackPrompt(history, summary, topics) }
      ];
      const fb = await callLLMWithRetry(fbMessages);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply, done: true, feedback: parseFeedback(fb), questionCount: userCount + 1 }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: reply.trim(), done: false, questionCount: userCount + 1, shouldEnd: userCount + 1 >= 15 }));
  } catch (err) {
    console.error('API Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => console.log(`Dev server: http://localhost:${PORT}`));
