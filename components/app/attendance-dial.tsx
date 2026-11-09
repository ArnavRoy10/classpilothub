// Half-circle dial made of 28 tick marks that light up as attendance rises.
export function AttendanceDial({ rate }: { rate: number | null }) {
  const TICKS = 28
  const filled = rate === null ? 0 : Math.round((rate / 100) * TICKS)
  const cx = 100
  const cy = 100
  const innerRadius = 70
  const outerRadius = 90

  const ticks = Array.from({ length: TICKS }).map((_, index) => {
    const t = index / (TICKS - 1)
    const angle = Math.PI + t * Math.PI
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
      x1: cx + innerRadius * cos,
      y1: cy + innerRadius * sin,
      x2: cx + outerRadius * cos,
      y2: cy + outerRadius * sin,
      on: index < filled,
      t,
    }
  })

  return (
    <div className="relative">
      <svg
        viewBox="0 0 200 112"
        className="w-full"
        role="img"
        aria-label={rate === null ? 'No attendance recorded today' : `${rate}% of students present today`}
      >
        {ticks.map((tick, index) => (
          <line
            key={index}
            x1={tick.x1.toFixed(2)}
            y1={tick.y1.toFixed(2)}
            x2={tick.x2.toFixed(2)}
            y2={tick.y2.toFixed(2)}
            strokeWidth="5"
            strokeLinecap="round"
            stroke={tick.on ? undefined : 'currentColor'}
            className={tick.on ? undefined : 'text-foreground/15'}
            style={tick.on ? { stroke: `color-mix(in oklch, oklch(0.86 0.13 var(--h2)) ${Math.round((1 - tick.t) * 100)}%, oklch(0.72 0.2 var(--h3)))` } : undefined}
          />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
        <span className="font-display text-3xl font-semibold leading-none">{rate === null ? '—' : `${rate}%`}</span>
        <span className="mt-1 text-[11px] text-muted-foreground">{rate === null ? 'Not marked yet' : 'present today'}</span>
      </div>
    </div>
  )
}
