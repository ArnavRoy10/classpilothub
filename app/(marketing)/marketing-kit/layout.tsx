import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Marketing kit',
  robots: { index: false, follow: false },
}

export default function MarketingKitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
