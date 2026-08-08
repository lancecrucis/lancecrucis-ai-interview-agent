import { useState, useRef, useEffect } from 'react'

export default function ChatWindow({ candidate, messages, isLoading, onSend, onEnd, onBack, selectedTopics, theme, onToggleTheme }) {
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
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>Back</button>
        <div className="header-info">
          <h2>{candidate.member.name}</h2>
          <span className="header-meta">{candidate.member.jobRole}</span>
        </div>
        <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        {questionCount >= 10 && (
          <button className="end-btn" onClick={onEnd} disabled={isLoading}>
            End Interview
          </button>
        )}
      </div>

      {selectedTopics.length > 0 && (
        <div className="topic-bar">
          {selectedTopics.slice(0, 5).map((t, i) => (
            <span key={t.day} className={`topic-chip ${i === Math.min(questionCount, selectedTopics.length - 1) ? 'active' : ''}`}>
              {t.title.split(' ').slice(0, 3).join(' ')}
            </span>
          ))}
        </div>
      )}

      <div className="messages-area">
        {messages.length === 0 && !isLoading && (
          <div className="start-prompt">
            <h3>Ready to begin</h3>
            <p>This interview will assess {candidate.member.name}'s understanding across multiple topics from the AI Cohort.</p>
            <button className="start-btn" onClick={() => onSend('__START__')}>
              Start
            </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? "Thinking..." : "Type your answer..."}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
