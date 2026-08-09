// /api/interview.js — Vercel Serverless Function
// Uses Groq API with auto-fallback for fast, free interviews

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
- Make it feel like a real conversation, not an interrogation

CHALLENGE MOMENTS:
- Occasionally (every 3-4 questions), drop a real-world scenario into the conversation
- Frame it as: "Let me throw a scenario at you..." or "Imagine you're on the job..."
- Examples: healthcare chatbot safety, financial data hallucination, deployment failure at 2am
- Evaluate their answer to the scenario as you would any other question`;

// ===================== LLM CALLS =====================

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
        break;
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

// ===================== CANDIDATE DATA =====================

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

// ===================== INTERVIEW STATE =====================

function analyzeConversationState(history) {
  const assistantMsgs = history.filter(m => m.role === 'assistant');
  const userMsgs = history.filter(m => m.role === 'user');
  const questionCount = userMsgs.length;

  // Simple heuristics for state tracking
  const lastAnswer = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].text : '';

  // Detect struggle signals
  const struggleSignals = ['idk', "don't know", 'not sure', 'umm', 'uhh', 'maybe', 'i think', "can't remember", 'no idea'];
  const strongSignals = ['definitely', 'exactly', 'specifically', 'for example', 'in my experience', 'the difference is', 'because'];

  const lastAnswerLower = lastAnswer.toLowerCase();
  const isStruggling = struggleSignals.some(s => lastAnswerLower.includes(s)) && lastAnswer.length < 150;
  const isStrong = strongSignals.some(s => lastAnswerLower.includes(s)) && lastAnswer.length > 100;

  // Estimate difficulty level based on performance
  let difficulty = 'intermediate';
  if (questionCount <= 3) difficulty = 'warmup';
  else if (isStrong) difficulty = 'advanced';
  else if (isStruggling) difficulty = 'foundational';

  // Should we drop a challenge moment?
  // After question 3, and every 3-4 questions after, with some randomness
  const shouldChallenge = questionCount >= 3 &&
    (questionCount === 3 || questionCount === 7 || questionCount === 11);

  return {
    questionCount,
    difficulty,
    isStruggling,
    isStrong,
    shouldChallenge,
    topicsCovered: estimateTopicsCovered(history),
  };
}

function estimateTopicsCovered(history) {
  const assistantTexts = history.filter(m => m.role === 'assistant').map(m => m.text).join(' ');
  const topicKeywords = ['embedding', 'vector', 'rag', 'prompt', 'fine-tun', 'agent', 'langchain', 'mcp', 'docker', 'security'];
  return topicKeywords.filter(k => assistantTexts.toLowerCase().includes(k)).length;
}

// ===================== PROMPTS =====================

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

function buildFollowUpPrompt(history, candidateSummary, selectedTopics, state) {
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
  const coveredCount = Object.values(topicCoverage).filter(c => c > 0).length;
  const userCount = history.filter(m => m.role === 'user').length;

  let adaptiveInstructions = '';

  if (state.shouldChallenge) {
    adaptiveInstructions = `
CHALLENGE MOMENT — Now is the time to introduce a real-world scenario!
Drop a practical challenge based on what the candidate has discussed. Frame it naturally:
"Let me throw a scenario at you..." or "Imagine you're building this for a real client..."

Good scenarios:
- A healthcare chatbot needs to refuse medical advice
- A RAG system retrieves incorrect legal documents
- A fine-tuned model starts hallucinating in production
- An agent framework gets stuck in an infinite loop

Evaluate their scenario answer just like any other question. After the scenario, move to a new topic.`;
  } else if (state.isStruggling) {
    adaptiveInstructions = `
ADAPTIVE MODE: The candidate is struggling.
- Give them a hint or reframe the question
- Be encouraging: "That's a good start, let me help you think about it differently..."
- After giving them a chance, move to a topic they're stronger in
- Ask simpler, more focused questions`;
  } else if (state.isStrong) {
    adaptiveInstructions = `
ADAPTIVE MODE: The candidate is doing well.
- Increase difficulty — ask deeper "why" and "how" questions
- Push for real-world examples: "Can you give me a specific example?"
- Challenge their assumptions: "What would happen if...?"
- Move to their weaker topics to test breadth`;
  } else {
    adaptiveInstructions = `
ADAPTIVE MODE: Normal pace.
- Continue with your planned topic rotation
- Mix conceptual and practical questions
- If answer is surface-level, probe deeper`;
  }

  return `You are conducting a technical interview. Here is the conversation so far:

${conversationText}

Candidate profile for reference:
${candidateSummary}

All topics to cover in this interview:
${topicsList}

Topics covered so far: ${coveredCount} of ${selectedTopics.length}
Questions asked so far: ${userCount}
Current difficulty level: ${state.difficulty}

Topics to focus on NEXT (least covered so far): ${nextTopics}

${adaptiveInstructions}

CRITICAL RULES:
- Ask exactly ONE question
- Keep response to 2-3 sentences max (excluding the question)
- You MUST ask about different topics — do NOT stay on the same topic for more than 2 questions

ENDING THE INTERVIEW:
- You MUST cover at least 4 different topics before ending
- You MUST ask at least 8 questions total
- When you have covered all topics AND asked at least 8 questions, end with a warm closing message
- To signal the interview is over, end your message with exactly: [DONE]
- Example closing: "Thank you for your time today. It was a pleasure discussing your experience. [DONE]"
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

  // Identify the challenge moment if it exists
  const challengeIndex = conversationText.indexOf('scenario');
  const hasChallenge = challengeIndex > -1 || conversationText.toLowerCase().includes('throw a scenario');

  return `The interview has concluded. Here is the full conversation:

${conversationText}

Candidate profile:
${candidateSummary}

Topics that were covered:
${topicsList}

${hasChallenge ? 'Note: This interview included a challenge moment (real-world scenario). Include it in your feedback.' : ''}

Generate a comprehensive interview evaluation. Output ONLY the raw JSON object — no thinking, no markdown, no code fences:

{
  "score": 72,
  "recommendation": "Hire",
  "confidence": "High",
  "oneLiner": "Strong on RAG and embeddings, needs work on fine-tuning concepts",
  "summary": "2-3 sentence overall assessment of the candidate's performance",
  "topicBreakdown": [
    {"topic": "Day X: Topic Name", "rating": "Strong", "note": "Specific observation about their answer"}
  ],
  "challengeMoment": {
    "question": "The scenario that was presented",
    "answer": "How the candidate responded",
    "quality": "Strong/Weak/Partial",
    "insight": "What this revealed about the candidate"
  },
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

CONFIDENCE:
- "High": Clear patterns in answers, confident in assessment
- "Medium": Mixed signals, some answers hard to evaluate
- "Low": Candidate was vague, hard to assess accurately

RULES:
- score must be an integer 0-100
- recommendation must be one of: "Strong Hire", "Hire", "Maybe", "No Hire"
- confidence must be one of: "High", "Medium", "Low"
- oneLiner: one sentence summary, max 15 words
- topicBreakdown must cover ALL topics that were discussed
- If there was a challenge moment, include challengeMoment with the scenario and their answer
- Include 2-3 specific examples of questions and answers
- Be honest and specific — reference actual things the candidate said
- strengths: 2-4 items
- gaps: 2-3 items
- next: 2-3 actionable recommendations
- START with the opening curly brace`;
}

// ===================== CURRICULUM =====================

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

// ===================== FEEDBACK PARSING =====================

function parseFeedback(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: parsed.score || 50,
        recommendation: parsed.recommendation || 'Maybe',
        confidence: parsed.confidence || 'Medium',
        oneLiner: parsed.oneLiner || '',
        summary: parsed.summary || '',
        topicBreakdown: parsed.topicBreakdown || [],
        challengeMoment: parsed.challengeMoment || null,
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
    confidence: 'Low',
    oneLiner: 'Assessment based on limited data',
    summary: text,
    topicBreakdown: [],
    challengeMoment: null,
    strengths: [],
    gaps: [],
    examples: [],
    next: [],
  };
}

// ===================== HANDLER =====================

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

    // Analyze conversation state
    const state = analyzeConversationState(history);

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
      return res.status(200).json({
        reply: reply.trim(),
        done: false,
        selectedTopics: topics,
        state: { difficulty: 'warmup', questionCount: 0 }
      });
    }

    // Follow-up with adaptive state
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
      { role: 'user', content: buildFollowUpPrompt(history, candidateSummary, topics, state) }
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
      shouldEnd,
      state: {
        difficulty: state.difficulty,
        questionCount: userResponseCount + 1,
        isStruggling: state.isStruggling,
        isStrong: state.isStrong,
        shouldChallenge: state.shouldChallenge,
      }
    });

  } catch (error) {
    console.error('Interview API error:', error);
    return res.status(500).json({ error: 'Interview processing failed', message: error.message });
  }
}
