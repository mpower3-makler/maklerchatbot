import ChatInterface from '../../components/ChatInterface'
import { notFound } from 'next/navigation'

export default function ChatPage({ params }) {
  const { slug } = params

  // Optional: nur numerische Property-IDs zulassen
  if (!/^[0-9]+$/.test(slug)) {
    notFound()
  }

  return <ChatInterface slug={slug} />
}

