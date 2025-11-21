'use client'

import { useState, useRef, useEffect } from 'react'

const EXAMPLE_QUESTIONS = [
  'Welche Modernisierungsmaßnahmen werden im Energieausweis empfohlen?',
  'Gab es in den letzten Jahren energetische Sanierungen (z.B. Fenster, Dämmung, Heizung)?',
  'Wie hoch sind die monatlichen Nebenkosten?',
]

export default function ChatInterface({ slug }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return

    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          slug, // wichtig, damit die API die URL bauen kann
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const botMessage = {
          role: 'assistant',
          content: data.response || 'Antwort empfangen',
        }
        setMessages((prev) => [...prev, botMessage])
      } else {
        throw new Error(data.error || 'Unbekannter Fehler')
      }
    } catch (error) {
      console.error('Fehler:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleExampleClick = (question) => {
    sendMessage(question)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md px-6 py-4 border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Objekt-Chat
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Property ID: {slug}
        </p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 md:px-6 py-4">
        {/* Scrollbarer Bereich: Beispielfragen + Nachrichten */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {/* Example Questions */}
          {messages.length === 0 && (
            <div className="mb-2 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Beispielfragen:
              </p>
              <div className="flex flex-col gap-2">
                {EXAMPLE_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleExampleClick(question)}
                    className="text-left px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md rounded-bl-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm shadow-md">
                <div className="flex space-x-2">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input-Bereich bleibt unten sichtbar */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Stelle hier deine Frage zum Objekt:
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Frage eingeben..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Senden
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
