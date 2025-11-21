import './globals.css'

export const metadata = {
  title: 'Immobilien Chat',
  description: 'Chat pro Objekt mit n8n Integration',
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}

