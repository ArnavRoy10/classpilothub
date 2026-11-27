import type { Metadata } from 'next'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSiteContent } from '@/lib/site-content'
import { SITE_NAME } from '@/lib/site-url'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact the ${SITE_NAME} team for a free demo, pricing questions or support. Send a message and we will reply by email.`,
  alternates: { canonical: '/contact' },
}

export default async function ContactPage() {
  const { text } = await getSiteContent()
  const email = text['site.contactEmail']

  return (
    <div className="border-b border-border bg-gradient-to-b from-primary/8 to-transparent">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
          Contact {SITE_NAME}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">
          Questions about pricing, a free demo for your coaching center, or help with your account? Send us an email and we will get back to you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" render={<a href={`mailto:${email}?subject=${encodeURIComponent(`${SITE_NAME} enquiry`)}`} />}>
            <Mail data-icon="inline-start" /> {email}
          </Button>
          <Button size="lg" variant="outline" render={<a href="/demo" />}>
            Book a free demo
          </Button>
        </div>
      </div>
    </div>
  )
}
