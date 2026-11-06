import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Magnetic } from '@/components/fx/magnetic'
import { ParticleField } from '@/components/fx/particle-field'
import { HeroScene } from '@/components/fx/hero-scene'
import { TiltCard } from '@/components/fx/tilt-card'
import { Reveal } from '@/components/fx/reveal'

const highlights = ['No setup fees', '14-day free trial', 'Cancel anytime']

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="aurora absolute inset-0 -z-20" />
      <div aria-hidden="true" className="grid-bg absolute inset-x-0 top-0 -z-10 h-[680px]" />
      <ParticleField className="-z-10" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-10 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-start">
          <span className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-neon" aria-hidden="true" />
            Built for tutors, teachers &amp; coaching centers
          </span>
          <h1 className="font-display text-5xl leading-[1.04] font-bold tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
            Run the class.
            <span className="text-gradient block pb-1">Not the chaos.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
            ClassPilot gives tutors and coaching centers one clear workspace for students, batches, attendance, fees, and results — so every day starts with less chasing and more teaching.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Magnetic>
              <Button size="lg" className="shadow-[0_0_40px_-6px] shadow-primary/70" render={<Link href="/signup" />}>
                Start free trial
                <ArrowRight data-icon="inline-end" />
              </Button>
            </Magnetic>
            <Magnetic>
              <Button size="lg" variant="outline" className="glass border-white/15 bg-transparent" render={<a href="mailto:hello@classpilot.app?subject=ClassPilot%20demo" />}>
                Book a demo
              </Button>
            </Magnetic>
          </div>
          <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-neon" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroScene />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6" style={{ perspective: '1600px' }}>
        <Reveal>
          <TiltCard max={4} className="rounded-2xl">
            <div className="glass overflow-hidden rounded-2xl p-2 shadow-[0_40px_120px_-30px] shadow-violet-glow/60" style={{ transform: 'rotateX(6deg)' }}>
              <Image
                src="/hero-dashboard.png"
                alt="ClassPilot dashboard showing student, attendance and fee metrics"
                width={1600}
                height={1000}
                priority
                className="h-auto w-full rounded-xl"
              />
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  )
}
