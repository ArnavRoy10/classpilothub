'use client'

import { useEffect, useRef } from 'react'

// A fixed background that moves from dawn to morning, dusk and night as you scroll the page.
const layers = [
  // dawn
  'radial-gradient(90% 55% at 50% 105%, oklch(0.7 0.17 var(--h1) / 55%), transparent 70%), linear-gradient(180deg, oklch(0.2 0.05 var(--hb)), oklch(0.17 0.04 var(--hb)))',
  // morning light
  'radial-gradient(70% 45% at 80% -5%, oklch(0.8 0.14 var(--h2) / 38%), transparent 70%), linear-gradient(180deg, oklch(0.19 0.04 var(--hb)), oklch(0.16 0.03 var(--hb)))',
  // dusk
  'radial-gradient(80% 50% at 15% 100%, oklch(0.62 0.2 var(--h3) / 45%), transparent 70%), radial-gradient(60% 40% at 90% 10%, oklch(0.55 0.18 var(--h1) / 30%), transparent 70%), linear-gradient(180deg, oklch(0.18 0.05 var(--hb)), oklch(0.15 0.04 var(--hb)))',
  // night
  'radial-gradient(70% 50% at 50% -10%, oklch(0.45 0.14 265 / 40%), transparent 70%), linear-gradient(180deg, oklch(0.14 0.04 265), oklch(0.12 0.03 var(--hb)))',
]

export function ScrollSky() {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let frame = 0

    function update() {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      const position = progress * (layers.length - 1)
      refs.current.forEach((el, index) => {
        if (el) el.style.opacity = String(Math.max(0, 1 - Math.abs(position - index)))
      })
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-background">
      {layers.map((background, index) => (
        <div key={index} ref={(el) => { refs.current[index] = el }} className="absolute inset-0" style={{ background, opacity: index === 0 ? 1 : 0 }} />
      ))}
    </div>
  )
}