'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Fades and lifts content in as it scrolls into view. Content stays visible without JavaScript,
// for reduced-motion users, and when it is already on screen at load (no layout shift).
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'visible' | 'hidden' | 'shown'>('visible')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92) return // already on screen
    setState('hidden')
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setState('shown'); observer.disconnect() }
    }, { threshold: 0.12 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn('transition-[opacity,transform] duration-700 ease-out', state === 'hidden' && 'translate-y-6 opacity-0', className)}
      style={{ transitionDelay: state === 'shown' ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  )
}
