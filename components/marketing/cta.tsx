import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Magnetic } from '@/components/fx/magnetic'
import { Reveal } from '@/components/fx/reveal'

export function Cta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <div className="glass relative isolate overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
          <div aria-hidden="true" className="aurora absolute inset-0 -z-10 opacity-90" />
          <div aria-hidden="true" className="grid-bg absolute inset-0 -z-10 opacity-60" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              Make your next class <span className="text-gradient">easier to run</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              Bring your people, classes, and daily follow-through into one dependable workspace. Start your free trial today, or let us walk you through it first.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Magnetic>
                <Button size="lg" className="shadow-[0_0_40px_-6px] shadow-primary/70" render={<Link href="/signup" />}>
                  Start free trial
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </Magnetic>
              <Magnetic>
                <Button size="lg" variant="outline" className="glass border-white/15 bg-transparent" render={<Link href="/pricing" />}>
                  View pricing
                </Button>
              </Magnetic>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
