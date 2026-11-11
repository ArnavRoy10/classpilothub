import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/fx/reveal'
import { TiltCard } from '@/components/fx/tilt-card'
import { Magnetic } from '@/components/fx/magnetic'
import { FounderPhoto } from '@/components/founder/founder-photo'
import { Cta } from '@/components/marketing/cta'
import { FOUNDER } from '@/lib/founder-profile'

export const metadata: Metadata = {
  title: 'About',
  description: `Meet ${FOUNDER.name}, the founder of ClassPilot, and why it is being built.`,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="aurora absolute inset-0 -z-10 opacity-80" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start">
            <p className="text-sm font-medium text-neon">About</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-6xl">
              {FOUNDER.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">{FOUNDER.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Magnetic>
                <Button size="lg" render={<Link href="/signup" />}>
                  Start free trial
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </Magnetic>
              <Magnetic>
                <Button size="lg" variant="outline" className="glass border-white/15 bg-transparent" render={<a href={`mailto:${FOUNDER.email}`} />}>
                  <Mail data-icon="inline-start" />
                  Say hello
                </Button>
              </Magnetic>
            </div>
          </div>

          <Reveal className="mx-auto w-full max-w-sm">
            <TiltCard className="rounded-3xl">
              <div className="glass rounded-3xl p-4">
                <FounderPhoto size={320} shape="rounded" className="aspect-square h-auto w-full" />
                <div className="px-2 pt-4 pb-1">
                  <p className="font-display text-xl font-semibold">{FOUNDER.name}</p>
                  <p className="text-sm text-muted-foreground">{FOUNDER.role}</p>
                </div>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6" aria-labelledby="story-title">
        <Reveal>
          <h2 id="story-title" className="font-display text-3xl font-bold tracking-tight">Why ClassPilot</h2>
          <div className="mt-6 flex flex-col gap-5 text-lg leading-relaxed text-muted-foreground">
            {FOUNDER.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="principles-title">
        <Reveal>
          <h2 id="principles-title" className="font-display text-3xl font-bold tracking-tight">What I care about</h2>
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {FOUNDER.principles.map((item, index) => (
            <Reveal key={item.title} delay={index * 100}>
              <TiltCard className="h-full rounded-2xl">
                <div className="glass h-full rounded-2xl p-6">
                  <p className="font-display text-sm font-semibold text-neon">{String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 font-display text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <Cta />
    </>
  )
}
