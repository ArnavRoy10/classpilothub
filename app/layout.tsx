import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import Script from 'next/script'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { PageTransition } from '@/components/fx/page-transition'
import { PwaRegister } from '@/components/pwa/pwa-register'
import { getSiteContent } from '@/lib/site-content'
import { SITE_URL, SITE_NAME } from '@/lib/site-url'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata: Metadata = {
  // Without this, Next builds canonical/OG URLs from the deployment's
  // *.vercel.app address, which is how the duplicate site got indexed.
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: 'Manage students, teachers, batches, fees, attendance and results for your coaching center.',
  applicationName: SITE_NAME,
  // Favicon for browsers and Google search results (Google prefers a square icon of 48px or larger).
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image' },
  // iPhone: lets "Add to Home Screen" open the site as a full-screen app with the right name.
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  // NOTE: do not set `alternates.canonical` here. A canonical in the root
  // layout would apply to every page and mark them all as copies of the
  // homepage. Set it per page instead.
}

export const viewport: Viewport = { themeColor: '#f6f3e8' }

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
        <PwaRegister />
      </body>
    </html>
  )
}
