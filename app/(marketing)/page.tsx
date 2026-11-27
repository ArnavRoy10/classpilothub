import { Hero } from '@/components/marketing/hero'
import { FeaturesSection } from '@/components/marketing/features-section'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { PricingSection } from '@/components/marketing/pricing-section'
import { Faq } from '@/components/marketing/faq'
import type { Metadata } from 'next'
import { Cta } from '@/components/marketing/cta'
import { Audiences } from '@/components/marketing/audiences'
import { Marquee } from '@/components/marketing/marquee'
import { DayStory } from '@/components/marketing/day-story'
import { PLANS, PLAN_ORDER } from '@/lib/plans'
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from '@/lib/site-url'

// Re-checks your saved edits at most once a minute, so the page stays fast.
export const revalidate = 60

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  keywords: [
    'coaching institute management software',
    'coaching center software',
    'tuition management software',
    'fee management software for coaching',
    'student attendance software',
    'batch management software',
    'tutor management software',
    'ClassPilotHub',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
}

const prices = PLAN_ORDER.map((id) => PLANS[id].monthly)

// Tells Google the site's name, logo and what the product is, so results show "ClassPilotHub"
// instead of the bare domain and can describe the software correctly.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ['ClassPilot Hub', 'classpilothub.me'],
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon.png`,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: prices.length,
      },
    },
  ],
}

export default function HomePage() {
  return (
    <div className="relative isolate">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <Hero />
      <Marquee />
      <Audiences />
      <DayStory />
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <Faq />
      <Cta />
    </div>
  )
}
