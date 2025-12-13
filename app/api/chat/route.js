import { NextResponse } from 'next/server'

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/$/, '')
}

function slugFromPath(path) {
  if (!path) return null
  const clean = String(path).split('?')[0]
  const seg = clean.split('/').filter(Boolean)[0]
  return seg || null
}

function slugFromReferer(request) {
  const ref = request.headers.get('referer')
  if (!ref) return null
  try {
    const u = new URL(ref)
    return slugFromPath(u.pathname)
  } catch {
    return null
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    const message = body.message || body.input || body.text
    let slug =
      body.slug ||
      body?.metadata?.slug ||
      slugFromPath(body.path) ||
      slugFromReferer(request)

    if (!message) {
      return NextResponse.json(
        { error: 'message fehlt im Request' },
        { status: 400 }
      )
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'slug fehlt im Request (body.slug/body.path/referer)' },
        { status: 400 }
      )
    }

    const slugNorm = String(slug).trim().toLowerCase()
    const isStw = slugNorm.startsWith('stw')

    const baseUrl = isStw
      ? process.env.N8N_WEBHOOK_URL_STW
      : (process.env.N8N_WEBHOOK_URL_DEFAULT ?? process.env.N8N_WEBHOOK_URL)

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Webhook ENV fehlt: N8N_WEBHOOK_URL_STW und/oder N8N_WEBHOOK_URL_DEFAULT' },
        { status: 500 }
      )
    }

    const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

    // WICHTIG:
    // - STW: feste Webhook-URL (kein /slug)
    // - Default: wie bisher /<slug>
    const webhookUrl = isStw
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/${encodeURIComponent(slug)}`

    // Debug (Vercel Logs): zeigt dir, wohin geroutet wird
    console.log('[chat-router]', { slug, isStw, webhookUrl })

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        message,
        slug,
        sessionId: body.sessionId,
        path: body.path,
        metadata: body.metadata,
      }),
    })

    const text = await response.text()

    if (!response.ok) {
      console.error('n8n HTTP Fehler:', response.status, text)
      return NextResponse.json(
        { error: `n8n HTTP-Fehler ${response.status}`, details: text, webhookUrl },
        { status: 500 }
      )
    }

    let data
    try {
      data = JSON.parse(text)
    } catch {
      // Wenn n8n z.B. HTML zurückgibt, siehst du es hier
      return NextResponse.json(
        { error: 'n8n Antwort war kein gültiges JSON', raw: text, webhookUrl },
        { status: 500 }
      )
    }

    let answer
    if (Array.isArray(data)) {
      const first = data[0]
      const obj = first?.json ?? first
      answer = obj?.output || obj?.response || obj?.message || obj?.text
    } else if (data && typeof data === 'object') {
      answer = data.output || data.response || data.message || data.text
    }

    return NextResponse.json({ response: answer || 'Antwort empfangen' })
  } catch (error) {
    console.error('Chat API Fehler:', error)
    return NextResponse.json(
      { error: `Fehler beim Senden der Nachricht: ${error?.message ?? String(error)}` },
      { status: 500 }
    )
  }
}
