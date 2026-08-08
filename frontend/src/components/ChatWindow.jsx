import { useState, useRef, useEffect } from 'react'

export default function ChatWindow({ candidate, messages, isLoading, onSend, onEnd, onBack, selectedTopics }) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSend(input.trim())
      setInput('')
    }
  }

  const questionCount = messages.filter(m => m.role === 'user').length

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="header-info">
          <h2>Interview with {candidate.member.name}</h2>
          <span className="header-meta">
            {candidate.member.jobRole} • {candidate.member.yearsExperience}y exp • Q{questionCount + 1}
          </span>
        </div>
        {questionCount >= 8 && (
          <button className="end-btn" onClick={onEnd} disabled={isLoading}>
            End Interview
          </button>
        )}
      </div>

      {/* Topic indicators */}
      {selectedTopics.length > 0 && (
        <div className="topic-bar">
          <span className="topic-label">Focus areas:</span>
          {selectedTopics.slice(0, 4).map(t => (
            <span key={t.day} className={`topic-chip ${questionCount > 0 ? 'active' : ''}`}>
              Day {t.day}
            </span>
          ))}
          {selectedTopics.length > 4 && (
            <span className="topic-chip more">+{selectedTopics.length - 4}</span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="messages-area">
        {messages.length === 0 && !isLoading && (
          <div className="start-prompt">
            <div className="start-icon">🎯</div>
            <h3>Ready to begin?</h3>
            <p>This interview will assess {candidate.member.name}'s understanding across multiple topics from the AI Cohort.</p>
            <button className="start-btn" onClick={() => onSend('__START__')}>
              Start Interview
            </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-text">{msg.text}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? "Interviewer is thinking..." : "Type your answer..."}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? '⏳' : '→'}
        </button>
      </form>
    </div>
  )
}
