import type { Metadata } from 'next'
import { ArrowRight, CalendarCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSiteContent } from '@/lib/site-content'
import { SITE_NAME } from '@/lib/site-url'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Book a Free Demo',
  description: `See how ${SITE_NAME} runs students, batches, attendance, fees, tests and results for your coaching institute. Book a free demo.`,
  alternates: { canonical: '/demo' },
}

const topics = [
  'Student, teacher and batch records',
  'Attendance from any device, with low-attendance alerts',
  'Fee invoices, payment links and automatic reminders',
  'Tests, results and announcements',
]

export default async function DemoPage() {
  const { text } = await getSiteContent()
  const email = text['site.contactEmail']
  const subject = encodeURIComponent(`${SITE_NAME} demo`)
  const body = encodeURIComponent('Hi, I would like a free demo of ClassPilotHub.\n\nCenter name:\nNumber of students:\nCity:\n')

  return (
    <div className="border-b border-border bg-gradient-to-b from-primary/8 to-transparent">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h1 className="font-display text-center text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
          Book a free {SITE_NAME} demo
        </h1>
        <p className="mt-4 text-center text-lg leading-relaxed text-pretty text-muted-foreground">
          We will show you how your coaching institute can run from day one on {SITE_NAME}.
        </p>
        <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-foreground">
          {topics.map((topic) => (
            <li key={topic} className="flex items-start gap-3 rounded-md border border-border bg-background/70 p-3 text-sm">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" /> {topic}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" render={<a href={`mailto:${email}?subject=${subject}&body=${body}`} />}>
            Request a demo <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="lg" variant="outline" render={<a href="/signup" />}>
            Or start the 14-day free trial
          </Button>
        </div>
      </div>
    </div>
  )
}
