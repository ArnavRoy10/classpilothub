import Link from 'next/link'
import { ArrowRight, BookOpen, Building2, Check, GraduationCap, type LucideIcon } from 'lucide-react'
import { TiltCard } from '@/components/fx/tilt-card'
import { Reveal } from '@/components/fx/reveal'

type Audience = {
  title: string
  tagline: string
  icon: LucideIcon
  points: string[]
  href: string
  cta: string
  accent: string
  glow: string
}

const audiences: Audience[] = [
  {
    title: 'Home Tutor',
    tagline: 'One-to-one lessons, handled without the paperwork.',
    icon: GraduationCap,
    points: ['Keep every student and guardian in one place', 'Mark attendance in seconds', 'Track fees and send reminders'],
    href: '/signup?plan=Solo%20Tutor',
    cta: 'Start as a tutor',
    accent: 'from-cyan-400/25 via-sky-500/10 to-transparent',
    glow: 'text-cyan-300',
  },
  {
    title: 'Individual Teacher',
    tagline: 'Your classes, tests and results, beautifully organised.',
    icon: BookOpen,
    points: ['Batches and timetable that stay in sync', 'Tests, marks and result sheets', 'Announcements students actually see'],
    href: '/signup?plan=Solo%20Tutor',
    cta: 'Start as a teacher',
    accent: 'from-violet-400/25 via-indigo-500/10 to-transparent',
    glow: 'text-violet-300',
  },
  {
    title: 'Coaching Center',
    tagline: 'Run teachers, batches and fees across the whole center.',
    icon: Building2,
    points: ['Separate logins for teachers and students', 'Choose what each person can see and change', 'Fees, reports and billing in one dashboard'],
    href: '/signup?plan=Starter',
    cta: 'Start as a center',
    accent: 'from-fuchsia-400/25 via-pink-500/10 to-transparent',
    glow: 'text-fuchsia-300',
  },
]

export function Audiences() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="audiences-title">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-neon">Who it is for</p>
        <h2 id="audiences-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          One platform, three ways to teach
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">Whether you teach at a student&apos;s home or run a full center, ClassPilot fits the way you work.</p>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {audiences.map((item, index) => {
          const Icon = item.icon
          return (
            <Reveal key={item.title} delay={index * 120} className={index === 1 ? 'md:-translate-y-4' : undefined}>
              <TiltCard className="h-full rounded-2xl">
                <div className="glass relative flex h-full flex-col overflow-hidden rounded-2xl p-6">
                  <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                  <span className={`relative grid size-12 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10 ${item.glow}`}>
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="relative mt-5 font-display text-xl font-semibold">{item.title}</h3>
                  <p className="relative mt-1 text-sm text-muted-foreground">{item.tagline}</p>
                  <ul className="relative mt-5 flex flex-1 flex-col gap-2.5">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm">
                        <Check className={`mt-0.5 size-4 shrink-0 ${item.glow}`} aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={item.href} className={`relative mt-6 inline-flex items-center gap-1.5 text-sm font-medium ${item.glow} hover:underline`}>
                    {item.cta}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </TiltCard>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
