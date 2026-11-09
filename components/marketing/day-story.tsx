'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, CalendarCheck, Check, Megaphone, Wallet, type LucideIcon } from 'lucide-react'

type Step = { time: string; title: string; body: string; icon: LucideIcon; hue: string; points: string[] }

const steps: Step[] = [
  {
    time: '8:00 AM',
    title: 'Take attendance in seconds',
    body: 'Open today’s batch and tap who is here. Absences are on record before the first lesson ends.',
    icon: CalendarCheck,
    hue: 'var(--h1)',
    points: ['One tap per student', 'Guardian details always at hand', 'Daily and weekly attendance views'],
  },
  {
    time: '11:00 AM',
    title: 'Run tests, enter results',
    body: 'Create a test for any batch, enter marks in one table, and students see their own results in their portal.',
    icon: BarChart3,
    hue: 'var(--h2)',
    points: ['Tests for every batch', 'Marks in one table', 'Student portal with their results'],
  },
  {
    time: '4:00 PM',
    title: 'Collect fees without chasing',
    body: 'Send a payment link or show a UPI QR code. When a parent pays, the fee marks itself as paid.',
    icon: Wallet,
    hue: 'var(--h3)',
    points: ['Razorpay payment links', 'UPI QR codes parents can scan', 'Status updates by itself'],
  },
  {
    time: '8:00 PM',
    title: 'Close the day with clarity',
    body: 'Post an announcement, glance at the reports, and know exactly where tomorrow starts.',
    icon: Megaphone,
    hue: '265',
    points: ['Announcements students see', 'Fee and attendance reports', 'Everything ready for tomorrow'],
  },
]

// Scroll-driven story: the section stays pinned while a day at a center plays out, step by step.
export function DayStory() {
  const sectionRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let frame = 0

    function update() {
      frame = 0
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0
      if (barRef.current) barRef.current.style.transform = `scaleY(${progress.toFixed(3)})`
      setActive(Math.min(steps.length - 1, Math.floor(progress * steps.length)))
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section ref={sectionRef} aria-labelledby="day-story-title" className="relative" style={{ height: `${steps.length * 85}vh` }}>
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        {steps.map((step, index) => (
          <div
            key={step.time}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-700"
            style={{ opacity: active === index ? 1 : 0, background: `radial-gradient(55% 60% at 72% 50%, oklch(0.6 0.19 ${step.hue} / 28%), transparent 70%)` }}
          />
        ))}

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
          <div>
            <p className="text-sm font-medium text-neon">A day at your center</p>
            <h2 id="day-story-title" className="mt-2 font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              From first bell to last report
            </h2>
            <div className="mt-8 hidden gap-5 md:flex">
              <div className="relative w-px shrink-0 bg-border">
                <div ref={barRef} className="absolute inset-0 origin-top bg-primary" style={{ transform: 'scaleY(0)' }} />
              </div>
              <ol className="flex flex-col gap-5">
                {steps.map((step, index) => (
                  <li key={step.time} className={`transition-opacity duration-500 ${index === active ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="text-xs font-medium text-muted-foreground">{step.time}</p>
                    <p className="font-display text-lg font-semibold">{step.title}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="relative h-[24rem] sm:h-[27rem]" style={{ perspective: '1400px' }}>
            {steps.map((step, index) => {
              const Icon = step.icon
              const offset = index - active
              return (
                <div
                  key={step.time}
                  aria-hidden={offset !== 0}
                  className="glass absolute inset-0 flex flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-700 ease-out sm:p-8"
                  style={{
                    opacity: offset === 0 ? 1 : 0,
                    transform: offset === 0 ? 'translate3d(0, 0, 0) rotateX(0deg)' : offset > 0 ? 'translate3d(0, 40px, -80px) rotateX(-8deg)' : 'translate3d(0, -40px, -80px) rotateX(8deg)',
                    pointerEvents: offset === 0 ? 'auto' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-white/10">{step.time}</span>
                    <span className="grid size-12 place-items-center rounded-2xl ring-1 ring-white/10" style={{ background: `oklch(0.7 0.16 ${step.hue} / 22%)`, color: `oklch(0.88 0.12 ${step.hue})` }}>
                      <Icon className="size-6" />
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">{step.title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{step.body}</p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {step.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm">
                        <Check className="size-4 shrink-0 text-neon" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <span aria-hidden="true" className="pointer-events-none absolute -right-2 -bottom-6 font-display text-8xl font-bold text-transparent [-webkit-text-stroke:1px_oklch(1_0_0/12%)] sm:text-9xl">
                    {step.time.split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}