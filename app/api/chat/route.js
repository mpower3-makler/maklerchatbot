import { NextResponse } from 'next/server'

function buildWebhookUrl(templateUrl, slug) {
  const t = String(templateUrl || '').trim()
  const s = encodeURIComponent(String(slug || '').trim())
  if (!t) return null
  return t.includes(':slug') ? t.replace(':slug', s) : t.replace(/\/$/, '') + '/' + s
}

export async function POST(request) {
  try {
    const body = await request.json()

    const message = body.message || body.input || body.text
    const slug = body.slug || body?.metadata?.slug

    if (!message) {
      return NextResponse.json({ error: 'message fehlt im Request', body }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json(
        { error: 'slug fehlt im Request (wird nicht vom Frontend gesendet)', body },
        { status: 400 }
      )
    }

    const slugNorm = String(slug).trim().toLowerCase()
    const isStw = slugNorm.startsWith('stw')

    const templateUrl = isStw
      ? process.env.N8N_WEBHOOK_URL_STW
      : (process.env.N8N_WEBHOOK_URL_DEFAULT ?? process.env.N8N_WEBHOOK_URL)

    if (!templateUrl) {
      return NextResponse.json(
        { error: 'Webhook ENV fehlt', isStw, slug, env: { hasSTW: !!process.env.N8N_WEBHOOK_URL_STW, hasDEFAULT: !!process.env.N8N_WEBHOOK_URL_DEFAULT, hasOLD: !!process.env.N8N_WEBHOOK_URL } },
        { status: 500 }
      )
    }

    const webhookUrl = buildWebhookUrl(templateUrl, slug)
    console.log('[chat-router]', { slug, isStw, webhookUrl })

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, slug, sessionId: body.sessionId }),
    })

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: `n8n HTTP-Fehler ${response.status}`, details: text, slug, isStw, webhookUrl },
        { status: 500 }
      )
    }

    // n8n muss JSON liefern
    let data
    try { data = JSON.parse(text) } catch {
      return NextResponse.json(
        { error: 'n8n Antwort war kein gültiges JSON', raw: text, slug, isStw, webhookUrl },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
