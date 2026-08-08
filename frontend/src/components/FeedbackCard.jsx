export default function FeedbackCard({ candidate, feedback, messages, onBack, theme, onToggleTheme }) {
  const questionCount = messages.filter(m => m.role === 'user').length

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <div className="feedback-header-top">
          <button className="back-btn" onClick={onBack}>New Interview</button>
          <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
        <h1>Interview Complete</h1>
        <p>{candidate.member.name} answered {questionCount} questions</p>
      </div>

      {feedback ? (
        <div className="feedback-content">
          <div className="feedback-section">
            <h3>Summary</h3>
            <p>{feedback.summary}</p>
          </div>

          <div className="feedback-section">
            <h3>Strengths</h3>
            <ul className="strengths">
              {(feedback.strengths || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="feedback-section">
            <h3>Areas for Improvement</h3>
            <ul className="gaps">
              {(feedback.gaps || []).map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>

          <div className="feedback-section">
            <h3>Recommended Next Steps</h3>
            <ul className="next">
              {(feedback.next || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          <div className="feedback-section">
            <h3>Interview Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{questionCount}</span>
                <span className="stat-label">Questions</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.signals?.missionsCompleted || 0}</span>
                <span className="stat-label">Missions Done</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.signals?.missionsFirstTry || 0}</span>
                <span className="stat-label">First Try</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="feedback-loading">Generating feedback...</div>
      )}
    </div>
  )
}
