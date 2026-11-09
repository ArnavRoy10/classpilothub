'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Light canvas particle field in the brand colours. Fewer dots on phones, pauses when off-screen,
// and draws a single still frame for reduced-motion users.
export function ParticleField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const count = window.innerWidth < 768 ? 36 : 80
    const styles = getComputedStyle(document.documentElement)
    const hueA = Number(styles.getPropertyValue('--h2')) || 88
    const hueB = Number(styles.getPropertyValue('--h1')) || 42
    const points = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), z: 0.25 + Math.random() * 0.75, speed: 0.00003 + Math.random() * 0.00007, hue: Math.random() > 0.5 ? hueA : hueB,
    }))
    let width = 0
    let height = 0
    let frame = 0
    let visible = true

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas!.width = Math.max(1, Math.floor(width * dpr))
      canvas!.height = Math.max(1, Math.floor(height * dpr))
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(step: number) {
      ctx!.clearRect(0, 0, width, height)
      for (const p of points) {
        p.y -= p.speed * p.z * step
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
        ctx!.beginPath()
        ctx!.fillStyle = `oklch(0.88 0.12 ${p.hue} / ${(0.18 + p.z * 0.5).toFixed(2)})`
        ctx!.arc(p.x * width, p.y * height, 0.6 + p.z * 1.6, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    let last = performance.now()
    function loop(now: number) {
      if (!visible) return
      draw(Math.min(now - last, 50))
      last = now
      frame = requestAnimationFrame(loop)
    }

    resize()
    draw(0)
    const resizeObserver = new ResizeObserver(() => { resize(); draw(0) })
    resizeObserver.observe(canvas)

    let io: IntersectionObserver | undefined
    if (!reduce) {
      io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        cancelAnimationFrame(frame)
        if (visible) { last = performance.now(); frame = requestAnimationFrame(loop) }
      })
      io.observe(canvas)
    }

    return () => { cancelAnimationFrame(frame); resizeObserver.disconnect(); io?.disconnect() }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 size-full', className)} />
}