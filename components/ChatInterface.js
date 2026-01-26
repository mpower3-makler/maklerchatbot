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
    <div className="min-h-screen bg-slate-100 flex items-stretch justify-center px-4 py-6 font-sans">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_
