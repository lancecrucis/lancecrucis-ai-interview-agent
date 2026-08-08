// /api/interview.js — Vercel Serverless Function
// Uses Groq API for fast, free interviews

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

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

async function callLLM(messages, model = PRIMARY_MODEL) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
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
        break; // Exit retry loop, try fallback
      }
      if (isRateLimit && attempt < maxRetries) {
        const delay = (attempt + 1) * 2000;
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
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

  const topicCoverage = {};
  selectedTopics.forEach(t => { topicCoverage[t.day] = 0; });
  history.filter(m => m.role === 'assistant').forEach(m => {
    selectedTopics.forEach(t => {
      if (m.text.includes(`Day ${t.day}`) || m.text.toLowerCase().includes(t.title.toLowerCase().split(' ')[0])) {
        topicCoverage[t.day]++;
      }
    });
  });

  const sortedTopics = [...selectedTopics].sort((a, b) =>
    (topicCoverage[a.day] || 0) - (topicCoverage[b.day] || 0)
  );
  const nextTopics = sortedTopics.slice(0, 2).map(t => `Day ${t.day}: ${t.title}`).join(', ');

  // Count topics covered so far
  const coveredCount = Object.values(topicCoverage).filter(c => c > 0).length;
  const userCount = history.filter(m => m.role === 'user').length;

  return `You are conducting a technical interview. Here is the conversation so far:

${conversationText}

Candidate profile for reference:
${candidateSummary}

All topics to cover in this interview:
${topicsList}

Topics covered so far: ${coveredCount} of ${selectedTopics.length}
Questions asked so far: ${userCount}

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

ENDING THE INTERVIEW:
- You MUST cover at least 4 different topics before ending
- You MUST ask at least 8 questions total
- When you have covered all topics AND asked at least 8 questions, end with a warm closing message
- To signal the interview is over, end your message with exactly: [DONE]
- Example closing: "Thank you for your time today, ${history[0]?.text?.split(' ')?.[0] || 'Candidate'}. It was a pleasure discussing your experience. [DONE]"
- Do NOT say [DONE] until you have covered at least 4 topics and asked at least 8 questions
- Be natural and conversational`;
}

function buildFeedbackPrompt(history, candidateSummary, selectedTopics) {
  const conversationText = history.map(m =>
    `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`
  ).join('\n\n');

  const topicsList = selectedTopics.map(t =>
    `- Day ${t.day}: ${t.title}`
  ).join('\n');

  return `The interview has concluded. Here is the full conversation:

${conversationText}

Candidate profile:
${candidateSummary}

Topics that were covered:
${topicsList}

Generate a comprehensive interview evaluation. Output ONLY the raw JSON object — no thinking, no markdown, no code fences:

{
  "score": 72,
  "recommendation": "Hire",
  "summary": "2-3 sentence overall assessment of the candidate's performance",
  "topicBreakdown": [
    {"topic": "Day X: Topic Name", "rating": "Strong", "note": "Specific observation about their answer"}
  ],
  "strengths": ["s1", "s2", "s3"],
  "gaps": ["g1", "g2"],
  "examples": [
    {"question": "What the interviewer asked", "answer": "What the candidate said", "quality": "Strong/Weak/Partial"}
  ],
  "next": ["n1", "n2"]
}

SCORING GUIDE:
- 90-100: Exceptional — deep understanding, real-world experience, teaches concepts
- 75-89: Strong — solid answers, good understanding, minor gaps
- 60-74: Adequate — basic understanding, some gaps, needs mentorship
- 40-59: Developing — partial understanding, significant gaps, needs training
- 0-39: Insufficient — unable to demonstrate understanding

RECOMMENDATION:
- "Strong Hire" (85+): Ready for senior roles
- "Hire" (70-84): Good fit, can grow with support
- "Maybe" (55-69): Shows potential but needs development
- "No Hire" (below 55): Not ready for the role

RULES:
- score must be an integer 0-100
- recommendation must be one of: "Strong Hire", "Hire", "Maybe", "No Hire"
- topicBreakdown must cover ALL topics that were discussed
- Include 2-3 specific examples of questions and answers
- Be honest and specific — reference actual things the candidate said
- strengths: 2-4 items
- gaps: 2-3 items
- next: 2-3 actionable recommendations
- START with the opening curly brace`;
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

function parseFeedback(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      // Ensure required fields exist
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
  return {
    score: 50,
    recommendation: 'Maybe',
    summary: text,
    topicBreakdown: [],
    strengths: [],
    gaps: [],
    examples: [],
    next: [],
  };
}

const MIN_QUESTIONS = 8;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });

  try {
    const { candidate, message, history = [], selectedTopics = [] } = req.body;
    if (!candidate) return res.status(400).json({ error: 'candidate is required' });

    const candidateSummary = buildCandidateSummary(candidate);
    const topics = selectedTopics.length > 0 ? selectedTopics : selectTopics(candidate);
    const userResponseCount = history.filter(m => m.role === 'user').length;

    // Manual end — generate feedback
    if (message === '__END__') {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        { role: 'user', content: buildFeedbackPrompt(history, candidateSummary, topics) }
      ];

      const feedbackText = await callLLMWithRetry(messages);
      const feedback = parseFeedback(feedbackText);

      return res.status(200).json({
        reply: 'Thank you for your time today. It was a pleasure interviewing you. Here is your feedback:',
        done: true,
        feedback
      });
    }

    // Start interview
    if (history.length === 0) {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildStartPrompt(candidateSummary, topics) }
      ];

      const reply = await callLLMWithRetry(messages);
      return res.status(200).json({ reply: reply.trim(), done: false, selectedTopics: topics });
    }

    // Follow-up
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: buildFollowUpPrompt(history, candidateSummary, topics) }
    ];

    let reply = await callLLMWithRetry(messages);

    // Check if AI signaled interview is done
    const isDone = reply.includes('[DONE]');
    if (isDone) {
      reply = reply.replace('[DONE]', '').trim();

      // Generate feedback automatically
      const feedbackMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        { role: 'assistant', content: reply },
        { role: 'user', content: buildFeedbackPrompt(history, candidateSummary, topics) }
      ];

      const feedbackText = await callLLMWithRetry(feedbackMessages);
      const feedback = parseFeedback(feedbackText);

      return res.status(200).json({
        reply,
        done: true,
        feedback,
        questionCount: userResponseCount + 1,
      });
    }

    // Auto-force end if too many questions
    const shouldEnd = userResponseCount + 1 >= 15;

    return res.status(200).json({
      reply: reply.trim(),
      done: false,
      questionCount: userResponseCount + 1,
      shouldEnd
    });

  } catch (error) {
    console.error('Interview API error:', error);
    return res.status(500).json({ error: 'Interview processing failed', message: error.message });
  }
}
