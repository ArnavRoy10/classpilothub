'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

type Action = { label: string; href: string }

// Friendly hello card with a glowing orb and one-tap shortcuts to the things you do most.
export function GreetingCard({ name, orgName, actions }: { name: string; orgName: string; actions: Action[] }) {
  const [hello, setHello] = useState('Hi')
  useEffect(() => {
    const hour = new Date().getHours()
    setHello(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  return (
    <Card className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="aurora absolute inset-0 -z-10 opacity-70" />
      <div className="flex items-center justify-between gap-4 px-(--card-spacing)">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold leading-tight">{hello}, {name.split(' ')[0] || 'there'}!</p>
          <p className="mt-1 text-sm text-muted-foreground">Ready to run {orgName} today?</p>
        </div>
        <div aria-hidden="true" className="relative size-20 shrink-0 animate-float">
          <div className="orb-sm absolute inset-0 rounded-full" />
          <div className="absolute left-[18%] top-[12%] h-[22%] w-[34%] rotate-[-24deg] rounded-full bg-white/35 blur-[3px]" />
        </div>
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-(--card-spacing)">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="glass rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-primary/20">
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
