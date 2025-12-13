import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'chat_session_id'

function buildWebhookUrl(templateUrl, slug) {
  const t = String(templateUrl || '').trim()
  const s = encodeURIComponent(String(slug || '').trim())
  if (!t) return null
  if (t.includes(':slug')) return t.replace(':slug', s)
  return t.replace(/\/$/, '') + '/' + s
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

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

function generateSessionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
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
    const slug =
      body.slug ||
      (body.metadata && body.metadata.slug) ||
      body.propertyId ||
      body.property_id ||
      slugFromPath(body.path) ||
      slugFromReferer(request)

    if (!message || !slug) {
      return NextResponse.json(
        { error: 'message oder slug fehlt im Request', got: { message: !!message, slug } },
        { status: 400 }
      )
    }

    // SessionId: Body > Cookie > neu generieren
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieSessionId = getCookieValue(cookieHeader, SESSION_COOKIE_NAME)
    const sessionId = body.sessionId || cookieSessionId || generateSessionId()

    const path = body.path
    const metadata = body.metadata

    // Routing: stw* => STW, sonst DEFAULT (ursprünglicher)
    const slugNorm = String(slug).trim().toLowerCase()
    const isStw = slugNorm.startsWith('stw')

    const templateUrl = isStw
      ? process.env.N8N_WEBHOOK_URL_STW
      : process.env.N8N_WEBHOOK_URL_DEFAULT

    if (!templateUrl) {
      const res = NextResponse.json(
        {
          error: 'N8N_WEBHOOK_URL_DEFAULT / N8N_WEBHOOK_URL_STW ist nicht konfiguriert',
          env: {
            hasDEFAULT: !!process.env.N8N_WEBHOOK_URL_DEFAULT,
            hasSTW: !!process.env.N8N_WEBHOOK_URL_STW,
          },
        },
        { status: 500 }
      )
      res.headers.append(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure`
      )
      return res
    }

    const webhookUrl = buildWebhookUrl(templateUrl, slug)
    if (!webhookUrl) {
      const res = NextResponse.json({ error: 'Webhook URL konnte nicht gebaut werden' }, { status: 500 })
      res.headers.append(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure`
      )
      return res
    }

    console.log('[chat-router]', { slug, isStw, webhookUrl, sessionId })

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, slug, sessionId, path, metadata }),
    })

    const raw = await resp.text()

    if (!resp.ok) {
      console.error('n8n HTTP Fehler:', resp.status, raw)
      const res = NextResponse.json(
        { error: `n8n HTTP-Fehler ${resp.status}`, details: raw },
        { status: 500 }
      )
      res.headers.append(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure`
      )
      return res
    }

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      const res = NextResponse.json({ response: raw, sessionId })
      res.headers.append(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure`
      )
      return res
    }

    let answer = null
    if (Array.isArray(data)) {
      const first = data[0]
      answer = pickAnswer(first) || pickAnswer(first && first.json)
    } else {
      answer = pickAnswer(data) || pickAnswer(data && data.json)
    }

    const res = NextResponse.json({ response: answer || raw, sessionId })
    res.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure`
    )
    return res
  } catch (error) {
    console.error('Chat API Fehler:', error)
    return NextResponse.json(
      { error: `Fehler beim Senden der Nachricht: ${error && error.message ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
