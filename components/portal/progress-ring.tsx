// Donut ring. `id` must be unique on the page (it names the colour gradient).
export function ProgressRing({ id, value, size = 112, label }: { id: string; value: number | null; size?: number; label?: string }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const shown = value ?? 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={value === null ? 'No data yet' : `${value}%`}>
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'oklch(0.84 0.14 var(--h2))' }} />
            <stop offset="100%" style={{ stopColor: 'oklch(0.72 0.2 var(--h3))' }} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" strokeLinecap="round" stroke={`url(#ring-${id})`} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - shown / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        <span>
          <span className="block font-display text-xl font-semibold leading-none">{value === null ? '—' : `${value}%`}</span>
          {label && <span className="mt-1 block text-[10px] text-muted-foreground">{label}</span>}
        </span>
      </span>
    </div>
  )
}
