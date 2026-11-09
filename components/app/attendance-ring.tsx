import { Card } from '@/components/ui/card'

// Donut showing today's attendance rate.
export function AttendanceRing({ rate, present, total }: { rate: number | null; present: number; total: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const value = rate ?? 0
  return (
    <Card>
      <div className="flex items-center justify-between gap-4 px-(--card-spacing)">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Attendance today</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{rate === null ? '—' : `${present}/${total}`}</p>
          <p className="mt-1 text-xs text-muted-foreground">{rate === null ? 'Nothing recorded yet' : 'students present'}</p>
        </div>
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={rate === null ? 'No attendance recorded today' : `${rate}% present today`}>
            <defs>
              <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" style={{ stopColor: 'oklch(0.84 0.14 var(--h2))' }} />
                <stop offset="100%" style={{ stopColor: 'oklch(0.72 0.2 var(--h3))' }} />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-muted" />
            <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" strokeLinecap="round" stroke="url(#ring-gradient)" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-sm font-semibold">{rate === null ? '—' : `${rate}%`}</span>
        </div>
      </div>
    </Card>
  )
}
