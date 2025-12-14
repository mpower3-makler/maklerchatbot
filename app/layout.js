import './globals.css'

export const metadata = {
  title: "Immobilien-Assistent – Demo",
  description: "Immobilien-Service, der mitdenkt.",
};


export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}

