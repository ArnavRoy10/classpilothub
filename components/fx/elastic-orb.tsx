'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// A glossy orb you can grab and pull. It stretches toward your cursor and springs back with a wobble.
export function ElasticOrb({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const body = bodyRef.current
    if (!host || !body) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (hintRef.current) hintRef.current.style.display = 'none'
      return
    }

    let x = 0
    let y = 0
    let vx = 0
    let vy = 0
    let targetX = 0
    let targetY = 0
    let originX = 0
    let originY = 0
    let dragging = false
    let frame = 0

    function render() {
      const distance = Math.hypot(x, y)
      const stretch = 1 + Math.min(distance / 170, 0.85)
      const squash = 1 / Math.sqrt(stretch)
      const angle = Math.atan2(y, x)
      body!.style.transform = `translate3d(${(x * 0.5).toFixed(2)}px, ${(y * 0.5).toFixed(2)}px, 0) rotate(${angle}rad) scale(${stretch.toFixed(3)}, ${squash.toFixed(3)}) rotate(${-angle}rad)`
    }

    function tick() {
      vx = (vx + (targetX - x) * 0.14) * 0.8
      vy = (vy + (targetY - y) * 0.14) * 0.8
      x += vx
      y += vy
      render()
      const resting = !dragging && Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02 && Math.hypot(x - targetX, y - targetY) < 0.2
      if (resting) {
        x = 0
        y = 0
        body!.style.transform = ''
        frame = 0
        return
      }
      frame = requestAnimationFrame(tick)
    }

    function start() {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    function down(event: PointerEvent) {
      dragging = true
      originX = event.clientX
      originY = event.clientY
      host!.setPointerCapture(event.pointerId)
      host!.style.cursor = 'grabbing'
      if (hintRef.current) hintRef.current.style.opacity = '0'
      start()
    }

    function move(event: PointerEvent) {
      if (!dragging) return
      let dx = event.clientX - originX
      let dy = event.clientY - originY
      const distance = Math.hypot(dx, dy)
      const max = 150
      if (distance > max) { dx = (dx / distance) * max; dy = (dy / distance) * max }
      targetX = dx
      targetY = dy
    }

    function up() {
      if (!dragging) return
      dragging = false
      targetX = 0
      targetY = 0
      host!.style.cursor = 'grab'
      start()
    }

    host.addEventListener('pointerdown', down)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerup', up)
    host.addEventListener('pointercancel', up)
    return () => {
      cancelAnimationFrame(frame)
      host.removeEventListener('pointerdown', down)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerup', up)
      host.removeEventListener('pointercancel', up)
    }
  }, [])

  return (
    <div ref={hostRef} className={cn('relative cursor-grab touch-none select-none', className)}>
      <div ref={bodyRef} className="absolute inset-0 will-change-transform">
        <div className="orb absolute inset-0 rounded-full" />
        <div className="absolute left-[18%] top-[12%] h-[22%] w-[34%] rotate-[-24deg] rounded-full bg-white/35 blur-md" />
      </div>
      <span ref={hintRef} className="glass pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-[11px] whitespace-nowrap text-muted-foreground transition-opacity duration-500">
        Grab &amp; pull
      </span>
    </div>
  )
}