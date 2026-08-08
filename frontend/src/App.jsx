import { useState, useEffect } from 'react'
import CandidatePicker from './components/CandidatePicker'
import ChatWindow from './components/ChatWindow'
import FeedbackCard from './components/FeedbackCard'
import candidatesData from './data/candidates.json'
import './App.css'

function handleApiError(errorStr) {
  if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
    return 'Rate limit reached. Please wait a moment and try again.'
  }
  return errorStr
}

function App() {
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [messages, setMessages] = useState([])
  const [isInterviewDone, setIsInterviewDone] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate)
    setMessages([])
    setIsInterviewDone(false)
    setFeedback(null)
    setSelectedTopics([])
  }

  const handleStartInterview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: selectedCandidate,
          message: '',
          history: [],
          selectedTopics: []
        })
      })

      const data = await response.json()
      if (data.error) throw new Error(handleApiError(data.error))

      setMessages([{ role: 'assistant', text: data.reply }])
      if (data.selectedTopics) setSelectedTopics(data.selectedTopics)
    } catch (err) {
      setMessages([{ role: 'assistant', text: `Error starting interview: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (text) => {
    if (text === '__START__') {
      return handleStartInterview()
    }

    const userMessage = { role: 'user', text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: selectedCandidate,
          message: text,
          history: newMessages,
          selectedTopics
        })
      })

      const data = await response.json()
      if (data.error) throw new Error(handleApiError(data.error))

      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])

      if (data.done && data.feedback) {
        setIsInterviewDone(true)
        setFeedback(data.feedback)
      }

      if (data.shouldEnd && !isInterviewDone) {
        setTimeout(() => handleEndInterview([...newMessages, { role: 'assistant', text: data.reply }]), 500)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndInterview = async (currentMessages) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: selectedCandidate,
          message: '__END__',
          history: currentMessages || messages,
          selectedTopics
        })
      })

      const data = await response.json()
      if (data.error) throw new Error(handleApiError(data.error))

      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
      setIsInterviewDone(true)
      if (data.feedback) setFeedback(data.feedback)
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error ending interview: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedCandidate(null)
    setMessages([])
    setIsInterviewDone(false)
    setFeedback(null)
    setSelectedTopics([])
  }

  return (
    <div className="app">
      {!selectedCandidate ? (
        <CandidatePicker
          candidates={candidatesData.candidates}
          onSelect={handleSelectCandidate}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : !isInterviewDone ? (
        <ChatWindow
          candidate={selectedCandidate}
          messages={messages}
          isLoading={isLoading}
          onSend={handleSendMessage}
          onEnd={() => handleEndInterview()}
          onBack={handleBack}
          selectedTopics={selectedTopics}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <FeedbackCard
          candidate={selectedCandidate}
          feedback={feedback}
          messages={messages}
          onBack={handleBack}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  )
}

export default App
