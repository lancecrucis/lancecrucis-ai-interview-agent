import { days, getDayById, getModuleForDay } from '../data/curriculum';

/**
 * Analyze candidate profile and select topics for interview.
 * Returns an array of curriculum day objects to focus on.
 */
export function selectTopics(candidate, numTopics = 6) {
  const missions = candidate.missions || [];
  const missionMap = {};
  missions.forEach(m => { missionMap[m.day] = m; });

  // Score each curriculum day based on candidate's performance
  const scoredDays = days
    .filter(d => d.type !== 'SETUP' && d.type !== 'CAPSTONE')
    .map(d => {
      const mission = missionMap[d.day];
      let score = 0;
      let reason = '';

      if (!mission) {
        // Never attempted — good to test
        score = 8;
        reason = 'not_attempted';
      } else if (mission.skipped) {
        // Skipped — important gap
        score = 9;
        reason = 'skipped';
      } else if (!mission.passed) {
        // Failed — biggest gap
        score = 10;
        reason = 'failed';
      } else if (mission.attempts >= 4) {
        // Passed but struggled
        score = 7;
        reason = 'struggled';
      } else if (mission.attempts >= 2) {
        // Passed with some difficulty
        score = 5;
        reason = 'moderate';
      } else {
        // Passed first try — strong area
        score = 3;
        reason = 'strong';
      }

      return { ...d, score, reason, mission };
    });

  // Sort by score (highest = most important to interview on)
  scoredDays.sort((a, b) => b.score - a.score);

  // Pick top N, but ensure diversity across modules
  const selected = [];
  const moduleCount = {};

  for (const day of scoredDays) {
    const mod = getModuleForDay(day.day);
    const modNum = mod ? mod.n : 0;

    // Limit 2 topics per module for diversity
    if ((moduleCount[modNum] || 0) >= 2) continue;

    selected.push(day);
    moduleCount[modNum] = (moduleCount[modNum] || 0) + 1;

    if (selected.length >= numTopics) break;
  }

  // If we don't have enough, fill from remaining
  if (selected.length < numTopics) {
    for (const day of scoredDays) {
      if (selected.find(s => s.day === day.day)) continue;
      selected.push(day);
      if (selected.length >= numTopics) break;
    }
  }

  return selected.slice(0, numTopics);
}

/**
 * Build a summary of the candidate for the LLM prompt.
 */
export function buildCandidateSummary(candidate) {
  const member = candidate.member;
  const missions = candidate.missions || [];
  const signals = candidate.signals || {};

  const passed = missions.filter(m => m.passed);
  const failed = missions.filter(m => m.passed === false);
  const skipped = missions.filter(m => m.skipped);

  return `
## Candidate Profile
- **Name:** ${member.name}
- **Role:** ${member.jobRole}
- **Experience:** ${member.yearsExperience} years
- **Education:** ${member.education}
- **Status:** ${member.status}

## Performance Summary
- Total missions completed: ${signals.missionsCompleted || passed.length}
- First-try passes: ${signals.missionsFirstTry || 0}
- Active days: ${signals.commitDays || 0}

## Missions Passed (${passed.length})
${passed.map(m => `- Day ${m.day}: ${m.title} (${m.attempts} attempt${m.attempts > 1 ? 's' : ''})`).join('\n')}

## Missions Failed (${failed.length})
${failed.map(m => `- Day ${m.day}: ${m.title} (${m.attempts} attempts)`).join('\n')}

## Missions Skipped (${skipped.length})
${skipped.map(m => `- Day ${m.day}: ${m.title}`).join('\n')}
  `.trim();
}

/**
 * Determine interview status from conversation history.
 */
export function getInterviewStatus(history) {
  const userMessages = history.filter(m => m.role === 'user');
  const aiMessages = history.filter(m => m.role === 'model');

  return {
    totalQuestions: aiMessages.length,
    userResponses: userMessages.length,
    isStarted: aiMessages.length > 0,
    lastQuestion: aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : null,
  };
}
