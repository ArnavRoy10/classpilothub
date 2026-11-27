import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_NAME } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Sitemap',
  description: `Complete sitemap of ${SITE_NAME}: coaching institute management software for students, batches, attendance, fees, tests and results.`,
  alternates: { canonical: '/sitemap' },
}

const pages = [
  { href: '/', label: 'Home', text: 'Coaching institute management software overview.' },
  { href: '/features', label: 'Features', text: 'Students, teachers, batches, attendance, fees, tests, results and timetable.' },
  { href: '/pricing', label: 'Pricing', text: 'Simple plans for solo tutors and coaching centers, with a 14-day free trial.' },
  { href: '/demo', label: 'Book a free demo', text: 'See ClassPilotHub run a coaching institute.' },
  { href: '/about', label: 'About', text: 'The founder and why ClassPilotHub is being built.' },
  { href: '/contact', label: 'Contact', text: 'Get in touch for a demo, pricing or support.' },
  { href: '/tutors', label: 'Find a tutor', text: 'Browse tutors and coaching centers taking new students.' },
  { href: '/privacy', label: 'Privacy', text: 'How ClassPilotHub handles account and workspace data.' },
  { href: '/terms', label: 'Terms of service', text: 'The terms that govern use of ClassPilotHub.' },
  { href: '/security', label: 'Security', text: 'Security practices for ClassPilotHub workspaces.' },
  { href: '/login', label: 'Log in', text: 'Sign in to your ClassPilotHub workspace.' },
]

export default function SitemapPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">Sitemap</h1>
      <p className="mt-3 text-muted-foreground">Every main page of {SITE_NAME} in one place.</p>
      <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
        {pages.map((page) => (
          <li key={page.href}>
            <Link href={page.href} className="block p-4 transition-colors hover:bg-secondary/50">
              <span className="font-medium text-primary">{page.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{page.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
