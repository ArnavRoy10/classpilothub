import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Magnetic } from '@/components/fx/magnetic'
import { Reveal } from '@/components/fx/reveal'
import { RichText } from '@/components/site/rich-text'
import { getSiteContent } from '@/lib/site-content'

export async function Cta() {
  const { text } = await getSiteContent()

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <div className="glass relative isolate overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
          <div aria-hidden="true" className="aurora absolute inset-0 -z-10 opacity-90" />
          <div aria-hidden="true" className="grid-bg absolute inset-0 -z-10 opacity-60" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              {text['cta.title1']} <span className="text-gradient">{text['cta.title2']}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              <RichText text={text['cta.body']} />
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Magnetic>
                <Button size="lg" className="shadow-[0_0_40px_-6px] shadow-primary/70" render={<Link href="/signup" />}>
                  {text['cta.button1']}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </Magnetic>
              <Magnetic>
                <Button size="lg" variant="outline" className="glass border-white/15 bg-transparent" render={<Link href="/pricing" />}>
                  {text['cta.button2']}
                </Button>
              </Magnetic>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
