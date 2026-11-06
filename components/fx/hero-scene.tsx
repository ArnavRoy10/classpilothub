'use client'

import { useRef } from 'react'
import { BarChart3, BookOpen, CalendarCheck, GraduationCap, Megaphone, Wallet, type LucideIcon } from 'lucide-react'

// Pure CSS 3D hero: a glass orb with orbiting rings and floating "educational object" tiles at
// different depths. Moves with the pointer (parallax). No WebGL, so it is light on phones.
const chips: { icon: LucideIcon; label: string; className: string; depth: number; delay: string }[] = [
  { icon: GraduationCap, label: 'Students', className: 'left-[2%] top-[14%]', depth: 26, delay: '0s' },
  { icon: CalendarCheck, label: 'Attendance', className: 'right-[0%] top-[8%]', depth: 38, delay: '-2s' },
  { icon: Wallet, label: 'Fees', className: 'right-[4%] bottom-[22%]', depth: 30, delay: '-4s' },
  { icon: BarChart3, label: 'Results', className: 'left-[6%] bottom-[16%]', depth: 44, delay: '-1s' },
  { icon: BookOpen, label: 'Batches', className: 'left-[38%] -bottom-[2%]', depth: 20, delay: '-3s' },
  { icon: Megaphone, label: 'Notices', className: 'left-[44%] -top-[2%]', depth: 16, delay: '-5s' },
]

export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null)

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || event.pointerType === 'touch') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--px', (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3))
    el.style.setProperty('--py', (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3))
  }

  function onLeave() {
    ref.current?.style.setProperty('--px', '0')
    ref.current?.style.setProperty('--py', '0')
  }

  const layer = (depth: number) => ({ transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px), 0)`, transition: 'transform 0.25s ease-out' })

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden="true">
      <div className="absolute inset-[12%] rounded-full bg-violet-glow/40 blur-3xl" />

      <div className="absolute inset-0 grid place-items-center" style={layer(10)}>
        <div className="relative size-[56%] animate-float">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 24%, oklch(0.97 0.04 230), oklch(0.68 0.2 272) 34%, oklch(0.32 0.17 285) 68%, oklch(0.16 0.08 290))',
              boxShadow: '0 0 90px oklch(0.62 0.22 285 / 55%), inset -22px -34px 70px oklch(0 0 0 / 55%), inset 14px 14px 40px oklch(1 0 0 / 22%)',
            }}
          />
          <div className="absolute left-[18%] top-[12%] h-[22%] w-[34%] rotate-[-24deg] rounded-full bg-white/35 blur-md" />
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center [perspective:900px]" style={layer(18)}>
        <div className="size-[88%] animate-ring-spin rounded-full border-[3px] border-neon/55 shadow-[0_0_30px_oklch(0.82_0.13_205/40%)]" style={{ transform: 'rotateX(72deg)' }} />
      </div>
      <div className="absolute inset-0 grid place-items-center [perspective:900px]" style={layer(24)}>
        <div className="size-[72%] animate-ring-spin rounded-full border-2 border-pink-glow/45 [animation-direction:reverse]" style={{ transform: 'rotateX(72deg)' }} />
      </div>

      {chips.map(({ icon: Icon, label, className, depth, delay }) => (
        <div key={label} className={`absolute ${className}`} style={layer(depth)}>
          <div className="glass flex animate-float items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-foreground" style={{ animationDelay: delay }}>
            <span className="grid size-7 place-items-center rounded-lg bg-primary/20 text-neon"><Icon className="size-4" /></span>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}
