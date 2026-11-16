import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, MoveUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichText } from '@/components/site/rich-text'
import { getSiteContent } from '@/lib/site-content'

export async function Hero() {
  const { text } = await getSiteContent()
  const highlights = [text['home.hero.h1'], text['home.hero.h2'], text['home.hero.h3']].filter(Boolean)

  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12 lg:px-10 lg:py-20">
        <div className="relative z-10 flex flex-col items-start">
          <div className="mb-6 inline-flex items-center gap-2 border border-foreground bg-accent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
            <span className="size-2 rounded-full bg-foreground" />
            {text['home.hero.badge']}
          </div>
          <h1 className="max-w-3xl font-display text-[clamp(3.2rem,10vw,6.6rem)] leading-[0.96] font-semibold tracking-[-0.075em] text-foreground">
            <span className="block">{text['home.hero.line1']}</span>
            <span className="inline-block bg-accent px-1">{text['home.hero.line2']}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            <RichText text={text['home.hero.body']} />
          </p>
          <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button size="lg" className="h-12 w-full justify-between rounded-md px-5 sm:w-auto" render={<Link href="/signup" />}>
              {text['home.hero.cta1']}
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 w-full rounded-md border-foreground px-5 sm:w-auto" render={<a href={`mailto:${text['site.contactEmail']}?subject=ClassPilot%20demo`} />}>
              {text['home.hero.cta2']}
              <MoveUpRight data-icon="inline-end" />
            </Button>
          </div>
          {highlights.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
                  <Check aria-hidden="true" className="size-4 text-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative min-w-0 pt-4 sm:pt-8 lg:pt-0">
          <div className="absolute -top-1 right-1 z-10 flex size-16 -rotate-6 flex-col items-center justify-center bg-accent text-center text-[10px] leading-tight font-bold uppercase tracking-wide text-foreground sm:right-6 sm:size-20 sm:text-xs">
            Made for
            <br />
            class days
          </div>
          <div className="overflow-hidden border border-foreground bg-card p-2 shadow-[8px_8px_0_var(--foreground)] sm:p-3 sm:shadow-[14px_14px_0_var(--foreground)]">
            <Image
              src="/hero-dashboard.png"
              alt="ClassPilot workspace preview showing student, attendance and fee information"
              width={1600}
              height={1000}
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="h-auto w-full border border-border object-cover"
            />
            <div className="flex items-center justify-between gap-3 px-2 py-3 sm:px-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">Your whole centre, in rhythm</p>
                <p className="mt-1 text-xs text-muted-foreground">One clear view of the work that matters.</p>
              </div>
              <span className="shrink-0 border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">01 / 04</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
