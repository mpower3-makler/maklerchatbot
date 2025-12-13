import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'chat_session_id'

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

function buildWebhookUrl(templateUrl, slug) {
  const t = String(templateUrl || '').trim()
  const s = encodeURIComponent(String(slug || '').trim())
  if (!t) return null
  return t.includes(':slug') ? t.replace(':slug', s) : t.replace(/\/$/, '') + '/' + s
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
    obj?.json?.text,
    obj?.json?.output,
    obj?.json?.response,
    obj?.json?.message,
    obj?.json?.answer,
  ].filter((v) => typeof v === 'string' && v.trim())
  return candidates[0] || null
}

export async function POST(request) {
  try {
    const body = await request.json()

    const message = body.message || body.input || body.text
    const slug =
      body.slug ||
      body?.metadata?.slug ||
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

    // Session: Body > Cookie > neu
    const cookieHeader = request.headers.get('cookie') || ''
    const cookieSessionId = getCookieValue(cookieHeader, SESSION_COOKIE_NAME)
    const sessionId = body.sessionId || cookieSessionId || generateSessionId()

    const slugNorm = String(slug).trim().toLowerCase()
    const isStw = slugNorm.startsWith('stw')

    const templateUrl = isStw
      ? process.env.N8N_WEBHOOK_URL_STW
      : process.env.N8N_WEBHOOK_URL_DEFAULT

    if (!templateUrl) {
      return NextResponse.json(
        {
          error: 'N8N_WEBHOOK_URL_DEFAULT / N8N_WEBHOOK_URL_STW ist nicht konfiguriert',
          env: {
            hasDEFAULT: !!process.env.N8N_WEBHOOK_URL_DEFAULT,
            hasSTW: !!process.env.N8N_WEBHOOK_URL_STW,
          },
        },
        { status: 500 }
      )
    }

    const webhookUrl = buildWebhookUrl(templateUrl, slug)
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL konnte nicht gebaut werden' }, { status: 500 })
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        slug,
        sessionId, // <- immer mitgeben
        path: body.path,
        metadata: body.metadata,
      }),
    })

    const raw = await resp.text()

    // Wenn n8n 200 aber leer zurückgibt -> deutlich machen
    if (resp.ok && (!raw || !raw.trim())) {
      const resEmpty = NextResponse.json(
        {
          error: 'n8n hat mit 200 geantwortet, aber ohne Body (content-length: 0). DEFAULT-Workflow muss eine Response zurückgeben.',
          sessionId,
        },
        { status: 502 }
      )
      const proto = request.headers.get('x-forwarded-proto') || ''
      const secure = proto === 'https' || request.url.startsWith('https://')
      resEmpty.cookies.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
      })
      return resEmpty
    }

    if (!resp.ok) {
      const resErr = NextResponse.json(
        { error: `n8n HTTP-Fehler ${resp.status}`, details: raw, sessionId },
        { status: 500 }
      )
      const proto = request.headers.get('x-forwarded-proto') || ''
      const secure = proto === 'https' || request.url.startsWith('https://')
      resErr.cookies.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
      })
      return resErr
    }

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      const resText = NextResponse.json({ response: raw, sessionId })
      const proto = request.headers.get('x-forwarded-proto') || ''
      const secure = proto === 'https' || request.url.startsWith('https://')
      resText.cookies.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/',
      })
      return resText
    }

    const answer = Array.isArray(data)
      ? pickAnswer(data[0]) || pickAnswer(data[0]?.json)
      : pickAnswer(data) || pickAnswer(data?.json)

    const res = NextResponse.json({ response: answer || raw, sessionId })
    const proto = request.headers.get('x-forwarded-proto') || ''
    const secure = proto === 'https' || request.url.startsWith('https://')
    res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
    })
    return res
  } catch (error) {
    return NextResponse.json(
      { error: `Fehler beim Senden der Nachricht: ${error?.message ?? String(error)}` },
      { status: 500 }
    )
  }
}
