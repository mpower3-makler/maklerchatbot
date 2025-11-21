import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, slug } = await request.json()

    const webhookUrl = process.env.N8N_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'n8n Webhook URL nicht konfiguriert' },
        { status: 500 }
      )
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        slug,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error('n8n Webhook Fehler')
    }

    const data = await response.json()

    return NextResponse.json({
      response: data.response || data.message || 'Antwort empfangen',
    })
  } catch (error) {
    console.error('Chat API Fehler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Senden der Nachricht' },
      { status: 500 }
    )
  }
}

