// dev-server.js — Local development server
import http from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4567;

let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
try {
  const envContent = readFileSync(join(__dirname, '.env'), 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=(.+)/);
  if (match) GEMINI_API_KEY = match[1].trim();
} catch {}

if (!GEMINI_API_KEY) { console.error('No GEMINI_API_KEY found'); process.exit(1); }
console.log('Gemini API key loaded');

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

  // Track topic coverage
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

  return `Technical interview in progress.\n\n${conv}\n\nCandidate: ${summary}\n\nTopics to cover:\n${topicList}\n\nFocus NEXT on: ${next}\n\nBased on their answer: acknowledge if good then move to a NEW topic. Probe if partial. Encourage if struggling. Ask ONE question. 2-3 sentences max. You MUST cover different topics — no more than 2 questions on the same topic.`;
}

function buildFeedbackPrompt(history, summary) {
  const conv = history.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`).join('\n\n');
  return `Interview concluded.\n\n${conv}\n\nCandidate: ${summary}\n\nReturn ONLY a JSON object (no markdown, no thinking, no code fences):\n{"summary":"2-3 sentence assessment","strengths":["s1","s2","s3"],"gaps":["g1","g2","g3"],"next":["n1","n2","n3"]}\n\nBe specific. Reference actual topics. 3-5 items per array.`;
}

async function callGemini(contents, systemInstruction = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = { contents, generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 } };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function toGeminiHistory(msgs) {
  return msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : m.role, parts: [{ text: m.text }] }));
}

function parseFeedback(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { summary: text, strengths: [], gaps: [], next: [] };
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

    // End interview
    if (userCount >= 8 && message === '__END__') {
      const fb = await callGemini([...toGeminiHistory(history), { role: 'user', parts: [{ text: buildFeedbackPrompt(history, summary) }] }]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: 'Thank you for your time. Here is your feedback:', done: true, feedback: parseFeedback(fb) }));
      return;
    }

    // Start
    if (history.length === 0) {
      const reply = await callGemini([{ role: 'user', parts: [{ text: buildStartPrompt(summary, topics) }] }], SYSTEM_PROMPT);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: reply.trim(), done: false, selectedTopics: topics }));
      return;
    }

    // Follow-up
    const gHistory = toGeminiHistory(history);
    const prompt = buildFollowUpPrompt(history, summary, topics);
    const contents = [...gHistory.slice(0, -1), { role: 'user', parts: [{ text: prompt }] }];
    const reply = await callGemini(contents, SYSTEM_PROMPT);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reply: reply.trim(), done: false, questionCount: userCount + 1, shouldEnd: userCount + 1 >= 12 }));
  } catch (err) {
    console.error('API Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => console.log(`Dev server: http://localhost:${PORT}`));
