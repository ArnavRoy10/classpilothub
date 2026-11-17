import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Script from 'next/script'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { PageTransition } from '@/components/fx/page-transition'
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
  const brand = {
    '--h1': String(theme.h1),
    '--h2': String(theme.h2),
    '--h3': String(theme.h3),
    '--hb': String(theme.hb),
  } as CSSProperties

  return (
    <html lang="en" suppressHydrationWarning style={brand}>
      <head>
        {/* Google Tag (gtag.js / GTM-5TCN7D9V) */}
        <Script
          src="https://www.googletagmanager.com/gtm.js?id=GTM-5TCN7D9V"
          strategy="afterInteractive"
        />
        <Script id="google-tag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-88Y38Y1K3P');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <PageTransition>{children}</PageTransition>
          <Toaster richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
