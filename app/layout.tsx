import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { getSiteContent } from '@/lib/site-content'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'ClassPilot', template: '%s | ClassPilot' },
  description: 'Manage students, teachers, batches, fees, attendance and results for your coaching center.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Brand colours saved in the founder console (falls back to the built-in colours).
  const { theme } = await getSiteContent()
  const brand = { '--h1': String(theme.h1), '--h2': String(theme.h2), '--h3': String(theme.h3), '--hb': String(theme.hb) } as CSSProperties

  return (
    <html lang="en" suppressHydrationWarning style={brand}>
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
