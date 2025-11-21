import ChatInterface from '../../components/ChatInterface'

export default function ChatPage({ params }) {
  const { slug } = params

  // Keine Einschränkung mehr – jede Slug zeigt den Chat
  return <ChatInterface slug={slug} />
}
