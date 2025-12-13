import { NextResponse } from 'next/server'

function buildWebhookUrl(templateUrl, slug) {
  const t = String(templateUrl || '').trim()
  const s = encodeURIComponent(String(slug || '').trim())
  if (!t) return null
  return t.includes(':slug') ? t.replace(':slug', s) : t.replace(/\/$/, '') + '/' + s
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

    // häufige verschachtelte Varianten:
    obj.data?.text,
    obj.data?.output,
    obj.data?.response,
    obj.data?.message,

    // n8n item format:
    obj.json?.text,
    obj.json?.output,
    obj.json?.response,
    obj.json?.message,
    obj.json?.answer,
    obj.json?.reply,
  ].filter(v => typeof v === 'string' && v.trim())

  return candidates[0] || null
}

export async function POST(request) {
  try {
    const { message, slug, sessionId, path, metadata } = await request.json()

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
        { error: 'N8N_WEBHOOK_URL_DEFAULT (oder N8N_WEBHOOK_URL) / N8N_WEBHOOK_URL_STW ist nicht konfiguriert' },
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
      body: JSON.stringify({ message,
