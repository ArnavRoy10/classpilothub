'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

// 3D tilt that follows the pointer, with a soft light that tracks the cursor.
// Touch devices and reduced-motion users get a plain card.
export function TiltCard({ children, className, max = 9 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || event.pointerType === 'touch') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    el.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${((x - 0.5) * max).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
  }

  function onLeave() {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('group relative transition-transform duration-200 ease-out will-change-transform', className)}
      style={{ transform: 'perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))' }}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), oklch(1 0 0 / 11%), transparent 60%)' }}
      />
    </div>
  )
}
