export default function FeedbackCard({ candidate, feedback, messages, onBack }) {
  const questionCount = messages.filter(m => m.role === 'user').length

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <button className="back-btn" onClick={onBack}>← New Interview</button>
        <h1>📋 Interview Complete</h1>
        <p>{candidate.member.name} • {questionCount} questions answered</p>
      </div>

      {feedback ? (
        <div className="feedback-content">
          {/* Summary */}
          <div className="feedback-section summary">
            <h3>📝 Summary</h3>
            <p>{feedback.summary}</p>
          </div>

          {/* Strengths */}
          <div className="feedback-section strengths">
            <h3>✅ Strengths</h3>
            <ul>
              {(feedback.strengths || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Gaps */}
          <div className="feedback-section gaps">
            <h3>⚠️ Areas for Improvement</h3>
            <ul>
              {(feedback.gaps || []).map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          <div className="feedback-section next">
            <h3>🚀 Recommended Next Steps</h3>
            <ul>
              {(feedback.next || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          {/* Interview Stats */}
          <div className="feedback-section stats">
            <h3>📊 Interview Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{questionCount}</span>
                <span className="stat-label">Questions Asked</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{messages.length}</span>
                <span className="stat-label">Total Messages</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.signals?.missionsCompleted || 0}</span>
                <span className="stat-label">Missions Completed</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="feedback-loading">
          <p>Generating feedback...</p>
        </div>
      )}
    </div>
  )
}
