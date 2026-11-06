'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

// Wraps a button/link so it leans toward the cursor.
export function Magnetic({ children, className, strength = 0.3 }: { children: React.ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  function onMove(event: React.PointerEvent<HTMLSpanElement>) {
    const el = ref.current
    if (!el || event.pointerType === 'touch') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    el.style.transform = `translate3d(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px, 0)`
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = 'translate3d(0, 0, 0)'
  }

  return (
    <span ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn('inline-block transition-transform duration-300 ease-out', className)}>
      {children}
    </span>
  )
}
