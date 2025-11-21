import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, slug } = await request.json()

    const baseUrl = process.env.N8N_WEBHOOK_URL

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'N8N_WEBHOOK_URL ist nicht konfiguriert' },
        { status: 500 }
      )
    }

    // Trailing Slash entfernen, falls vorhanden
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

    // slug an die URL anhängen -> n8n bekommt slug aus dem Pfad
    const webhookUrl = `${normalizedBaseUrl}/${encodeURIComponent(slug)}`

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        // slug schicken wir hier optional NICHT mehr mit,
        // weil n8n sie schon aus dem Pfad bekommt.
        timestamp: new Date().toISOString(),
      }),
    })

    const text = await response.text()

    if (!response.ok) {
      console.error('n8n HTTP Fehler:', response.status, text)
      return NextResponse.json(
        { error: `n8n HTTP-Fehler ${response.status}`, details: text },
        { status: 500 }
      )
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'n8n Antwort war kein gültiges JSON', raw: text },
        { status: 500 }
      )
    }

    return NextResponse.json({
      response: data.response || data.message || 'Antwort empfangen',
    })
  } catch (error) {
    console.error('Chat API Fehler:', error)
    return NextResponse.json(
      { error: `Fehler beim Senden der Nachricht: ${error.message}` },
      { status: 500 }
    )
  }
}
