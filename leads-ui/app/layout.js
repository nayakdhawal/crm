import './globals.css'

export const metadata = {
  title: 'Lead Capture & Estimate System',
  description: 'Capture leads, generate estimates, and manage your pipeline',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
