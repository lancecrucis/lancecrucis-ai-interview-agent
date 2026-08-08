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

  const getStatusColor = (candidate) => {
    const signals = candidate.signals || {}
    const ratio = (signals.missionsFirstTry || 0) / Math.max(signals.missionsCompleted || 1, 1)
    if (ratio > 0.8) return '#10b981' // green - excellent
    if (ratio > 0.5) return '#f59e0b' // yellow - good
    return '#ef4444' // red - needs work
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
        <h1>🎓 AI Interview Agent</h1>
        <p>Select a candidate to begin the interview</p>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, role, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="candidate-grid">
        {filtered.map(candidate => {
          const stats = getStats(candidate)
          return (
            <div
              key={candidate.member.id}
              className="candidate-card"
              onClick={() => onSelect(candidate)}
            >
              <div className="card-header">
                <div className="avatar" style={{ backgroundColor: getStatusColor(candidate) }}>
                  {candidate.member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="card-info">
                  <h3>{candidate.member.name}</h3>
                  <span className="role">{candidate.member.jobRole}</span>
                </div>
              </div>
              <div className="card-stats">
                <div className="stat">
                  <span className="stat-value">{stats.completed}</span>
                  <span className="stat-label">Missions</span>
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
              <div className="card-meta">
                <span>{candidate.member.education}</span>
                <span className="id-badge">{candidate.member.id}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="no-results">
          <p>No candidates found matching "{search}"</p>
        </div>
      )}
    </div>
  )
}
