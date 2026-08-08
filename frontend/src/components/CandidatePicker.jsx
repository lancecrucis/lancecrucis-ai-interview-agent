import { useState } from 'react'

export default function CandidatePicker({ candidates, onSelect }) {
  const [search, setSearch] = useState('')

  const filtered = candidates.filter(c => {
    const term = search.toLowerCase()
    return (
      c.member.name.toLowerCase().includes(term) ||
      c.member.jobRole.toLowerCase().includes(term) ||
      c.member.id.toLowerCase().includes(term)
    )
  })

  const getPerformanceLevel = (candidate) => {
    const signals = candidate.signals || {}
    const ratio = (signals.missionsFirstTry || 0) / Math.max(signals.missionsCompleted || 1, 1)
    if (ratio > 0.8) return 'excellent'
    if (ratio > 0.5) return 'good'
    return 'needs-work'
  }

  const getStats = (candidate) => {
    const signals = candidate.signals || {}
    return {
      completed: signals.missionsCompleted || 0,
      firstTry: signals.missionsFirstTry || 0,
      days: signals.commitDays || 0
    }
  }

  return (
    <div className="picker">
      <div className="picker-header">
        <h1>Interview Agent</h1>
        <p>Select a candidate to begin a technical interview</p>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="candidate-grid">
        {filtered.map(candidate => {
          const stats = getStats(candidate)
          const level = getPerformanceLevel(candidate)
          return (
            <button
              key={candidate.member.id}
              className={`candidate-card ${level}`}
              onClick={() => onSelect(candidate)}
            >
              <div className="card-top">
                <div className="card-identity">
                  <h3>{candidate.member.name}</h3>
                  <span className="card-role">{candidate.member.jobRole}</span>
                </div>
                <span className="card-id">{candidate.member.id}</span>
              </div>

              <div className="card-stats">
                <div className="stat">
                  <span className="stat-value">{stats.completed}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{stats.firstTry}</span>
                  <span className="stat-label">First Try</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{candidate.member.yearsExperience}y</span>
                  <span className="stat-label">Experience</span>
                </div>
              </div>

              <div className="card-footer">
                <span className="card-edu">{candidate.member.education}</span>
                <span className={`performance-badge ${level}`}>
                  {level === 'excellent' ? 'Strong' : level === 'good' ? 'Solid' : 'Developing'}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="no-results">
          No candidates found for "{search}"
        </div>
      )}
    </div>
  )
}
