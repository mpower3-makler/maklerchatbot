import { NextResponse } from 'next/server'

function buildWebhookUrl(templateUrl, slug) {
  const t = String(templateUrl || '').trim()
  const s = encodeURIComponent(String(slug || '').trim())
  if (!t) return null
  if (t.includes(':slug')) return t.replace(':slug', s)
  return t.replace(/\/$/, '') + '/' + s
}

function pickAnswer(obj) {
  if (!obj || typeof obj !== 'object') return null

  const candidates = [
    obj.text,
    obj.output,
    obj.response,
    obj.message,
    obj.answer,
    obj.reply,
    obj.result,

    obj.data && obj.data.text,
    obj.data && obj.data.output,
    obj.data && obj.data.response,
    obj.data && obj.data.message,

    obj.json && obj.json.text,
    obj.json && obj.json.output,
    obj.json && obj.json.response,
    obj.json && obj.json.message,
    obj.json && obj.json.answer,
    obj.json && obj.json.reply,
  ].filter((v) => typeof v === 'string' && v.trim())

  return candidates[0] || null
}

export async function POST(request) {
  try {
    const body = await request.json()

    const message = body.message || body.input || body.text
    const slug = body.slug || (body.metadata && body.metadata.slug)
    const sessionId = body.sessionId
    const path = body.path
    const metadata = body.metadata

    if (!message || !slug) {
      return NextResponse.json(
        { error: 'message oder slug fehlt im Request' },
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
        {
          error:
            'N8N_WEBHOOK_URL_DEFAULT (oder N8N_WEBHOOK_URL) / N8N_WEBHOOK_URL_STW ist nicht konfiguriert',
        },
        { status: 500 }
      )
    }

    const webhookUrl = buildWebhookUrl(templateUrl, slug)
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL konnte nicht gebaut werden' },
        { status: 500 }
      )
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        slug,
        sessionId,
        path,
        metadata,
      }),
    })

    const raw = await resp.text()

    if (!resp.ok) {
      console.error('n8n HTTP Fehler:', resp.status, raw)
      return NextResponse.json(
        { error: `n8n HTTP-Fehler ${resp.status}`, details: raw },
        { status: 500 }
      )
    }

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      // Falls n8n plain text zurückgibt
      return NextResponse.json({ response: raw })
    }

    let answer = null
    if (Array.isArray(data)) {
      const first = data[0]
      answer = pickAnswer(first) || pickAnswer(first && first.json)
    } else {
      answer = pickAnswer(data) || pickAnswer(data && data.json)
    }

    return NextResponse.json({
      response: answer || raw,
    })
  } catch (error) {
    console.error('Chat API Fehler:', error)
    return NextResponse.json(
      { error: `Fehler beim Senden der Nachricht: ${error && error.message ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
