import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {/* z-10 keeps the footer above the fixed scroll-sky background on the homepage */}
      <div className="relative z-10 bg-background/70 backdrop-blur-sm">
        <SiteFooter />
      </div>
    </div>
  )
}
