'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const STW_EXAMPLE_QUESTIONS = [
  'Wie bewerbe ich mich für einen Wohnheimplatz?', 
  'How do I apply for a room change?',             
  'Quelles sind die Regeln für die Nachtruhe?', 
  'Was muss ich beim Einzug beachten?'            
]

const LOADING_TEXTS_SHORT = [
  'Wissensdatenbank wird durchsucht…',
  'Richtlinien werden geprüft…',
  'Unterlagen werden abgeglichen…',
]

const LOADING_TEXTS_LONG = [
  'Einen Moment Geduld bitte…',
  'Thanks for your patience…',
  "Merci pour votre patience…",
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
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-3 md:p-6 font-sans text-slate-900">
      <div className="flex w-full max-w-3xl h-[85vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        
        {/* Compact Header */}
        <div className="border-b border-slate-100 bg-[#003d82] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-xs border border-white/20">STW</div>
            <div className="flex flex-col">
              <h1 className="text-xs font-bold text-white leading-none mb-1">Studierendenwerk Heidelberg</h1>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-blue-100/70 font-medium uppercase tracking-tight">AI Assistant • {slug}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Chat Area */}
        <div className="flex-1 overflow-y-auto bg-white px-4 py-4 space-y-4 scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-60">
              <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.15em]">Häufige Themen</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-md">
                {STW_EXAMPLE_QUESTIONS.map((q) => (
                  <button key={q} onClick={() => sendMessage(q)} className="text-left px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-[#003d82] hover:bg-blue-50 transition-all text-[13px] leading-tight">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`relative max-w-[88%] px-3.5 py-2.5 rounded-xl shadow-sm ${
                m.role === 'user' 
                  ? 'bg-[#003d82] text-white rounded-tr-none' 
                  : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
              }`}>
                <div className={`prose prose-sm max-w-none break-words leading-snug
                  ${m.role === 'user' ? 'prose-invert text-[14px]' : 'prose-slate text-[14px]'}
                  prose-p:my-0.5 prose-p:leading-snug
                  prose-strong:font-bold prose-strong:text-inherit
                  prose-ul:my-1 prose-ul:pl-4 prose-li:my-0
                  whitespace-pre-line`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-50 px-3 py-2 rounded-xl rounded-tl-none border border-slate-100 flex items-center space-x-2">
                <span className="text-[11px] text-slate-500 font-medium tracking-tight">{loadingText}</span>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-[#003d82] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-[#003d82] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* High-Performance Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="relative flex items-center max-w-3xl mx-auto group">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Nachricht senden..."
              className="w-full pl-4 pr-12 py-2.5 rounded-full bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#003d82]/20 focus:bg-white focus:border-[#003d82] text-[14px] transition-all"
              disabled={isLoading}
            />
            <button
              type="submit" disabled={isLoading || !input.trim()}
              className="absolute right-1.5 p-1.5 rounded-full bg-[#003d82] text-white hover:bg-[#002a5a] disabled:bg-slate-200 transition-all active:scale-90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            </button>
          </form>
          <div className="flex justify-between items-center mt-3 px-1 text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
            <span>Stand: Benutzungsordnung 2025</span>
            <span className="opacity-50">Heidelberg STW Assistant</span>
          </div>
        </div>
      </div>
    </div>
  )
}
