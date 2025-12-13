import { NextResponse } from 'next/server'

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

function buildWebhookUrl(templateUrl, slug) {
  const t = String(templateUrl || '').trim()
  const s = encodeURIComponent(String(slug || '').trim())
  if (!t) return null
  if (t.includes(':slug')) return t.replace(':slug', s)
  return t.replace(/\/$/, '') + '/' + s
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
      return NextResponse.json({ error: 'message fehlt im Request' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'slug fehlt (body.slug/body.path/referer)' }, { status: 400 })
    }

    const slugNorm = String(slug).trim().toLowerCase()
    const isStw = slugNorm.startsWith('stw')

    const templateUrl = isStw
      ? process.env.N8N_WEBHOOK_URL_STW
      : process.env.N8N_WEBHOOK_URL_DEFAULT

    if (!templateUrl) {
      return NextResponse.json(
        { error: 'Webhook ENV fehlt: N8N_WEBHOOK_URL_STW oder N8N_WEBHOOK_URL_DEFAULT' },
        { status: 500 }
      )
    }

    const webhookUrl = buildWebhookUrl(templateUrl, slug)
    console.log('[chat-router]', { slug, isStw, webhookUrl })

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
