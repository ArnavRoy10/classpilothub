'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

// Hello card for the student portal, with a glowing orb and shortcuts.
export function PortalGreeting({ name, subtitle, links }: { name: string; subtitle: string; links: { label: string; href: string }[] }) {
  const [hello, setHello] = useState('Hi')
  useEffect(() => {
    const hour = new Date().getHours()
    setHello(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  return (
    <Card className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="aurora absolute inset-0 -z-10 opacity-80" />
      <div className="flex items-center justify-between gap-4 px-(--card-spacing)">
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold leading-tight sm:text-3xl">{hello}, {name.split(' ')[0] || 'there'}!</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div aria-hidden="true" className="relative size-24 shrink-0 animate-float">
          <div className="orb-sm absolute inset-0 rounded-full" />
          <div className="absolute left-[18%] top-[12%] h-[22%] w-[34%] rotate-[-24deg] rounded-full bg-white/35 blur-[3px]" />
        </div>
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2 px-(--card-spacing)">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="glass rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-primary/20">{link.label}</Link>
          ))}
        </div>
      )}
    </Card>
  )
}
