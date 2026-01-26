'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const STW_EXAMPLE_QUESTIONS = [
  'Wie bewerbe ich mich für einen Wohnheimplatz?', 
  'How do I apply for a room change?',             
  'Quelles sont les règles pour le bruit la nuit ?', 
  'Was muss ich beim Einzug beachten?'            
]

const LOADING_TEXTS_SHORT = [
  'Ich durchsuche die Wissensdatenbank für Sie …',
  'Einen Moment, ich prüfe die offiziellen Richtlinien …',
  'Ich gleiche Ihre Frage mit allen Wohnheim-Unterlagen ab …',
]

const LOADING_TEXTS_LONG = [
  'Das dauert etwas länger als üblich. Danke für Ihre Geduld …',
  'This is taking a bit longer than usual. Thanks for your patience …',
  "Cela prend un peu plus de temps que d’habitude. Merci pour votre patience …",
]

export default function ChatInterface({ slug }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => {
    return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  })

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState('short')

  useEffect(() => {
    if (!isLoading) {
      setLoadingMsgIndex(0)
      setLoadingPhase('short')
      return
    }
    const phaseTimeout = setTimeout(() => setLoadingPhase('long'), 12000)
    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => i + 1)
    }, 3500)
    return () => {
      clearTimeout(phaseTimeout)
      clearInterval(interval)
    }
  }, [isLoading])

  const loadingTexts = loadingPhase === 'long' ? LOADING_TEXTS_LONG : LOADING_TEXTS_SHORT
  const loadingText = loadingTexts[loadingMsgIndex % loadingTexts.length]
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return
    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, slug, sessionId }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response || 'Antwort empfangen' }])
      } else {
        throw new Error(data.error || 'Fehler')
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Fehler. Bitte erneut versuchen.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-stretch justify-center px-4 py-6 font-sans text-slate-900">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
        
        {/* Header mit STW Branding */}
        <div className="border-b border-slate-200 bg-[#003d82] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#003d82] font-bold shadow-sm">
              STW
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-white">Studierendenwerk Heidelberg</h1>
              <p className="text-xs text-blue-100 opacity-80">Digitaler Assistent • {slug}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-blue-50">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Bereit</span>
            </div>
          </div>
        </div>

        {/* Chat-Bereich */}
        <div className="flex flex-1 flex-col bg-slate-50 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-8 space-y-8">
            {messages.length === 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Häufige Fragen:</p>
                <div className="flex flex-wrap gap-2">
                  {STW_EXAMPLE_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)} className="text-left px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#003d82] hover:text-[#003d82] transition-all text-sm">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                <div className={`max-w-[90%] md:max-w-[80%] px-5 py-4 rounded-2xl shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-[#003d82] text-white rounded-br-none' 
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                }`}>
                  {/* Markdown Container mit verbessertem Spacing */}
                  <div className={`prose prose-sm max-w-none 
                    ${m.role === 'user' ? 'prose-invert' : 'prose-slate'}
                    prose-p:my-3 prose-p:leading-relaxed 
                    prose-strong:font-bold 
                    prose-ul:my-2 prose-li:my-1`}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-500 font-medium">{loadingText}</span>
                    <div className="flex space-x-1">
                      {[0, 150, 300].map((d) => (
                        <div key={d} className="w-1.5 h-1.5 bg-[#003d82] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input-Bereich */}
          <div className="p-4 bg-white border-t border-slate-200">
            <p className="mb-3 text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <span>🌐</span>
              <span className="font-medium italic">Antwortet in jeder Sprache • Answers in any language</span>
            </p>

            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ihre Frage hier eingeben..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#003d82] focus:border-transparent text-sm transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 rounded-xl bg-[#003d82] text-white font-bold text-sm hover:bg-[#002a5a] disabled:bg-slate-300 transition-all shadow-md active:scale-95"
              >
                Senden
              </button>
            </form>
            
            <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed max-w-2xl mx-auto">
              Dies ist ein KI-Assistent des Studierendenwerks Heidelberg. Die Antworten basieren auf offiziellen 
              Dokumenten (z. B. Mietbedingungen, Hausordnung, Brandschutz) und dienen der Information. 
              Rechtlich bindend sind ausschließlich die unterzeichneten Verträge.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
