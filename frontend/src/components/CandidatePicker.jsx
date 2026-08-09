import { useState, useMemo } from 'react'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A→Z' },
  { value: 'name-desc', label: 'Name Z→A' },
  { value: 'exp-desc', label: 'Experience (High→Low)' },
  { value: 'exp-asc', label: 'Experience (Low→High)' },
  { value: 'completed-desc', label: 'Most Missions Done' },
  { value: 'firsttry-desc', label: 'Best First-Try Rate' },
  { value: 'education-asc', label: 'Education A→Z' },
]

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Candidates' },
  { value: 'top', label: 'Top Performers' },
  { value: 'needs-help', label: 'Needs Help' },
  { value: 'skipped', label: 'Skipped Content' },
  { value: 'no-attempts', label: 'No Attempts' },
]

export default function CandidatePicker({ candidates, onSelect, theme, onToggleTheme }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name-asc')
  const [filterBy, setFilterBy] = useState('all')

  const getStats = (candidate) => {
    const signals = candidate.signals || {}
    return {
      completed: signals.missionsCompleted || 0,
      firstTry: signals.missionsFirstTry || 0,
      days: signals.commitDays || 0
    }
  }

  const getPerformanceLevel = (candidate) => {
    const signals = candidate.signals || {}
    const ratio = (signals.missionsFirstTry || 0) / Math.max(signals.missionsCompleted || 1, 1)
    if (ratio > 0.8) return 'excellent'
    if (ratio > 0.5) return 'good'
    return 'needs-work'
  }

  const getMissionCounts = (candidate) => {
    const missions = candidate.missions || []
    return {
      passed: missions.filter(m => m.passed).length,
      failed: missions.filter(m => m.passed === false).length,
      skipped: missions.filter(m => m.skipped).length,
      total: missions.length,
    }
  }

  const processed = useMemo(() => {
    let result = candidates

    // Search filter
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(c =>
        c.member.name.toLowerCase().includes(term) ||
        c.member.jobRole.toLowerCase().includes(term) ||
        c.member.id.toLowerCase().includes(term) ||
        c.member.education.toLowerCase().includes(term)
      )
    }

    // Quick filter
    if (filterBy !== 'all') {
      result = result.filter(c => {
        const missions = c.missions || []
        const signals = c.signals || {}
        const failed = missions.filter(m => m.passed === false).length
        const skipped = missions.filter(m => m.skipped).length
        const passed = missions.filter(m => m.passed).length
        const total = missions.length
        const ratio = total > 0 ? passed / total : 0

        switch (filterBy) {
          case 'top': return ratio >= 0.8
          case 'needs-help': return failed >= 3
          case 'skipped': return skipped > 0
          case 'no-attempts': return total === 0 || (signals.missionsCompleted || 0) === 0
          default: return true
        }
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.member.name.localeCompare(b.member.name)
        case 'name-desc': return b.member.name.localeCompare(a.member.name)
        case 'exp-desc': return b.member.yearsExperience - a.member.yearsExperience
        case 'exp-asc': return a.member.yearsExperience - b.member.yearsExperience
        case 'completed-desc': {
          const ca = (a.signals?.missionsCompleted || 0)
          const cb = (b.signals?.missionsCompleted || 0)
          return cb - ca
        }
        case 'firsttry-desc': {
          const fa = (a.signals?.missionsFirstTry || 0) / Math.max(a.signals?.missionsCompleted || 1, 1)
          const fb = (b.signals?.missionsFirstTry || 0) / Math.max(b.signals?.missionsCompleted || 1, 1)
          return fb - fa
        }
        case 'education-asc': return a.member.education.localeCompare(b.member.education)
        default: return 0
      }
    })

    return result
  }, [candidates, search, sortBy, filterBy])

  return (
    <div className="picker">
      <div className="picker-header">
        <div className="picker-header-top">
          <div>
            <h1>Interview Agent</h1>
            <p>Select a candidate to begin a technical interview</p>
          </div>
          <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Sort & Filter Controls */}
        <div className="picker-controls">
          <div className="control-group">
            <label className="control-label">Sort</label>
            <select
              className="control-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-pills">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`filter-pill ${filterBy === opt.value ? 'active' : ''}`}
                onClick={() => setFilterBy(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="picker-results">
          {processed.length} candidate{processed.length !== 1 ? 's' : ''}
          {filterBy !== 'all' && ` · ${FILTER_OPTIONS.find(f => f.value === filterBy)?.label}`}
          {search && ` · "${search}"`}
        </div>
      </div>

      <div className="candidate-grid">
        {processed.map(candidate => {
          const stats = getStats(candidate)
          const level = getPerformanceLevel(candidate)
          const counts = getMissionCounts(candidate)
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

              {/* Mission breakdown bar */}
              {counts.total > 0 && (
                <div className="card-missions">
                  <div className="mission-bar">
                    {counts.passed > 0 && (
                      <div
                        className="mission-segment passed"
                        style={{ width: `${(counts.passed / counts.total) * 100}%` }}
                        title={`${counts.passed} passed`}
                      />
                    )}
                    {counts.failed > 0 && (
                      <div
                        className="mission-segment failed"
                        style={{ width: `${(counts.failed / counts.total) * 100}%` }}
                        title={`${counts.failed} failed`}
                      />
                    )}
                    {counts.skipped > 0 && (
                      <div
                        className="mission-segment skipped"
                        style={{ width: `${(counts.skipped / counts.total) * 100}%` }}
                        title={`${counts.skipped} skipped`}
                      />
                    )}
                  </div>
                  <div className="mission-legend">
                    <span className="legend-item passed">{counts.passed} passed</span>
                    {counts.failed > 0 && <span className="legend-item failed">{counts.failed} failed</span>}
                    {counts.skipped > 0 && <span className="legend-item skipped">{counts.skipped} skipped</span>}
                  </div>
                </div>
              )}

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

      {processed.length === 0 && (
        <div className="no-results">
          No candidates found. Try adjusting your search or filters.
        </div>
      )}
    </div>
  )
}
