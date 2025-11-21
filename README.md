# n8n Property Chat (Clean Setup)

Dieses Projekt ist ein minimaler Next.js 14 Chat-Client für Immobilien:
Jede URL mit einer Property-ID (z.B. `/3452345`) öffnet direkt einen Chat.
Die Property-ID wird als `slug` an deinen n8n-Webhook gesendet.

## Routen

- `/` -> immer 404 (keine öffentliche Startseite)
- `/{property_id}` -> Objekt-Chat, z.B. `/3452345`

## Beispiel

- `https://dein-projekt.vercel.app/3452345`

In der Chat-Oberfläche wird dann angezeigt:
`Property ID: 3452345`

## n8n Webhook

Setze in Vercel (oder lokal in `.env.local`) die Variable:

```bash
N8N_WEBHOOK_URL=https://deine-n8n-instanz.de/webhook/chat
```

Der Request an n8n sieht so aus:

```json
{
  "message": "User message",
  "slug": "3452345",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

n8n sollte im Response-Feld `response` einen Text zurückgeben:

```json
{
  "response": "Bot Antwort"
}
```

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Dann im Browser z.B. `http://localhost:3000/3452345` öffnen.

