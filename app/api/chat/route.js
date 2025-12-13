import { NextResponse } from 'next/server'

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, '')
}

function pickBaseUrl(slugRaw: string) {
  const slug = slugRaw.trim().toLowerCase()

  // Wenn slug mit "stw" startet -> Webhook 1
  if (slug.startsWith('stw')) {
    return process.env.N8N_WEBHOOK_URL_STW
  }

  // Sonst -> Webhook 2 (Default)
  return process.env.N8N_WEBHOOK_URL_DEFAULT ?? process.env.N8N_WEBHOOK_URL
}

export async function POST(request: Request) {
  try {
    const { message, slug, sessionId } = await request.json()

    if (!message || !slug) {
      return NextResponse.json(
        { error: 'message oder slug fehlt im Request' },
        { status: 400 }
      )
    }

    const baseUrl = pickBaseUrl(slug)
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'N8N_WEBHOOK_URL_DEFAULT (oder N8N_WEBHOOK_URL) / N8N_WEBHOOK_URL_STW ist nicht konfiguriert' },
        { status: 500 }
      )
    }

    const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

    // Beibehaltener Mechanismus: du hängst den slug als Pfad-Segment an
    // (Falls dein neuer STW-Workflow KEIN slug-Suffix braucht, sag Bescheid – dann schalten wir das je nach Workflow um.)
    const webhookUrl = `${normalizedBaseUrl}/${encodeURIComponent(slug)}`

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optional: Shared Secret für n8n Webhooks
        ...(process.env.N8N_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        message,
        sessionId,
        slug,
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

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: 'n8n Antwort war kein gültiges JSON', raw: text },
        { status: 500 }
      )
    }

    // Antwort normalisieren (dein bisheriges Verhalten)
    let answer: string | undefined

    if (Array.isArray(data)) {
      const first = data[0]
      const obj = first?.json ?? first
      answer = obj?.output || obj?.response || obj?.message || obj?.text
    } else if (data && typeof data === 'object') {
      answer = data.output || data.response || data.message || data.text
    }

    return NextResponse.json({
      response: answer || 'Antwort empfangen',
    })
  } catch (error: any) {
    console.error('Chat API Fehler:', error)
    return NextResponse.json(
      { error: `Fehler beim Senden der Nachricht: ${error?.message ?? String(error)}` },
      { status: 500 }
    )
  }
}
