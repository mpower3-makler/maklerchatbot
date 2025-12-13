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
  // crypto.randomUUID ist in modernen Runtimes verfügbar
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  // Fallback (sollte selten nötig sein)
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

  return candidates[0]
