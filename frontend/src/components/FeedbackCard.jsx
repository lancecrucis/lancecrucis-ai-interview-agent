export default function FeedbackCard({ candidate, feedback, messages, onBack, theme, onToggleTheme }) {
  const questionCount = messages.filter(m => m.role === 'user').length

  const getScoreColor = (score) => {
    if (score >= 85) return 'score-excellent'
    if (score >= 70) return 'score-good'
    if (score >= 55) return 'score-average'
    return 'score-weak'
  }

  const getRecColor = (rec) => {
    switch (rec) {
      case 'Strong Hire': return 'rec-strong-hire'
      case 'Hire': return 'rec-hire'
      case 'Maybe': return 'rec-maybe'
      case 'No Hire': return 'rec-no-hire'
      default: return 'rec-maybe'
    }
  }

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Strong': return 'rating-strong'
      case 'Solid': return 'rating-solid'
      case 'Weak': return 'rating-weak'
      default: return 'rating-solid'
    }
  }

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
          {/* Score and Recommendation */}
          <div className="feedback-score-section">
            <div className={`score-circle ${getScoreColor(feedback.score)}`}>
              <span className="score-number">{feedback.score}</span>
              <span className="score-label">/100</span>
            </div>
            <div className={`recommendation-badge ${getRecColor(feedback.recommendation)}`}>
              {feedback.recommendation}
            </div>
          </div>

          {/* Summary */}
          <div className="feedback-section">
            <h3>Assessment</h3>
            <p>{feedback.summary}</p>
          </div>

          {/* Topic Breakdown */}
          {feedback.topicBreakdown && feedback.topicBreakdown.length > 0 && (
            <div className="feedback-section">
              <h3>Topic Breakdown</h3>
              <div className="topic-breakdown-list">
                {feedback.topicBreakdown.map((topic, i) => (
                  <div key={i} className="topic-breakdown-item">
                    <div className="topic-breakdown-header">
                      <span className="topic-breakdown-name">{topic.topic}</span>
                      <span className={`topic-breakdown-rating ${getRatingColor(topic.rating)}`}>{topic.rating}</span>
                    </div>
                    {topic.note && <p className="topic-breakdown-note">{topic.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {feedback.examples && feedback.examples.length > 0 && (
            <div className="feedback-section">
              <h3>Key Moments</h3>
              <div className="examples-list">
                {feedback.examples.map((ex, i) => (
                  <div key={i} className="example-item">
                    <div className="example-question">Q: {ex.question}</div>
                    <div className="example-answer">A: {ex.answer}</div>
                    <span className={`example-quality ${getRatingColor(ex.quality)}`}>{ex.quality}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          <div className="feedback-section">
            <h3>Strengths</h3>
            <ul className="strengths">
              {(feedback.strengths || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Gaps */}
          <div className="feedback-section">
            <h3>Areas for Improvement</h3>
            <ul className="gaps">
              {(feedback.gaps || []).map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          <div className="feedback-section">
            <h3>Recommended Next Steps</h3>
            <ul className="next">
              {(feedback.next || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div className="feedback-section">
            <h3>Interview Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{questionCount}</span>
                <span className="stat-label">Questions</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{feedback.topicBreakdown?.length || 0}</span>
                <span className="stat-label">Topics Covered</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{candidate.signals?.missionsCompleted || 0}</span>
                <span className="stat-label">Missions Done</span>
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
