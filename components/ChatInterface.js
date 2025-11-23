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
  const [sessionId] = useState(() => {
    return (
      'sess_' +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    )
  })

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
    slug,       // welcher Chat
    sessionId,  // NEU: welche Session
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
    <div className="min-h-screen bg-slate-100 flex items-stretch justify-center px-4 py-6">
      {/* Chat-Karte */}
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 to-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              OB
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-slate-900">
                Objekt-Chat
              </h1>
              <p className="text-xs text-slate-500">
                Property ID{' '}
                <span className="ml-1 rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 shadow-sm">
                  {slug}
                </span>
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* Hauptbereich: Beispiele + Nachrichten */}
        <div className="flex flex-1 flex-col bg-slate-50">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Beispielfragen oben, solange der Chat leer ist */}
            {messages.length === 0 && (
              <div className="mb-1 space-y-2">
                <p className="text-xs font-medium text-slate-600">
                  💡 Beispiel-Fragen, die Sie dem Chat stellen können:
                </p>
                <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                  {EXAMPLE_QUESTIONS.map((question, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleExampleClick(question)}
                      className="text-left px-4 py-2.5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-blue-400 text-xs text-slate-700 hover:text-blue-600"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nachrichten */}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-900 shadow-sm rounded-bl-sm'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                  <div className="flex space-x-2">
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input-Bereich bleibt unten sichtbar */}
          <div className="border-t border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
            <p className="mb-1 text-xs text-slate-500">
              💬 Stellen Sie dem Chat Ihre Frage zum Objekt:
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ihre Frage eingeben …"
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                Senden
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
