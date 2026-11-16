'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { CalendarCheck, GraduationCap, Wallet } from 'lucide-react'

export function HeroPreview() {
  const sceneRef = useRef<HTMLDivElement>(null)

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const scene = sceneRef.current
    if (!scene || event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const bounds = scene.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5

    scene.style.setProperty('--hero-rotate-x', `${(-y * 5).toFixed(2)}deg`)
    scene.style.setProperty('--hero-rotate-y', `${(x * 7).toFixed(2)}deg`)
    scene.style.setProperty('--hero-shift-x', `${(x * 5).toFixed(2)}px`)
    scene.style.setProperty('--hero-shift-y', `${(y * 5).toFixed(2)}px`)
  }

  function resetPointer() {
    const scene = sceneRef.current
    if (!scene) return
    scene.style.setProperty('--hero-rotate-x', '0deg')
    scene.style.setProperty('--hero-rotate-y', '0deg')
    scene.style.setProperty('--hero-shift-x', '0px')
    scene.style.setProperty('--hero-shift-y', '0px')
  }

  return (
    <div
      ref={sceneRef}
      className="hero-preview-scene relative mx-auto w-full max-w-[620px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div className="hero-preview-glow" aria-hidden="true" />
      <div className="hero-preview-card relative z-10 overflow-hidden border border-foreground bg-card p-2 shadow-[8px_8px_0_var(--foreground)] sm:p-3 sm:shadow-[14px_14px_0_var(--foreground)]">
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

      <div className="hero-preview-chip hero-preview-chip--students" aria-hidden="true">
        <span className="hero-preview-chip-icon"><GraduationCap /></span>
        <span>Student roster</span>
      </div>
      <div className="hero-preview-chip hero-preview-chip--attendance" aria-hidden="true">
        <span className="hero-preview-chip-icon"><CalendarCheck /></span>
        <span>Attendance</span>
      </div>
      <div className="hero-preview-chip hero-preview-chip--fees" aria-hidden="true">
        <span className="hero-preview-chip-icon"><Wallet /></span>
        <span>Fee tracking</span>
      </div>

      <div className="hero-preview-sticker" aria-hidden="true">
        Made for<br />class days
      </div>
    </div>
  )
}
