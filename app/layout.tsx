import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './context/AuthContext'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Post My Note - Social Media Content Creator',
  description: 'Generate high-quality Instagram note posts using AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={playfairDisplay.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

