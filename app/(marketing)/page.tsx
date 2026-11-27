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
import { SITE_URL, SITE_NAME } from '@/lib/site-url'

// Re-checks your saved edits at most once a minute, so the page stays fast.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Coaching center software that keeps classes moving',
  description: 'ClassPilotHub helps tutors and coaching centers manage students, batches, attendance, fees, tests, and results in one clear workspace.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'ClassPilotHub — Run the class. Not the chaos.',
    description: 'A dependable workspace for the people and routines behind great classes.',
    url: '/',
  },
}

// Tells Google the site's name and logo, so results show "ClassPilotHub"
// instead of the bare domain.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: ['ClassPilotHub Hub', 'classpilothub.me'],
      inLanguage: 'en',
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon.png`,
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
