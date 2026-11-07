import { Card } from '@/components/ui/card'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// The current week as day pills, today highlighted, like a mini calendar.
export function WeekStrip({ todayStr, classCount }: { todayStr: string; classCount: number }) {
  const today = new Date(`${todayStr}T00:00:00`)
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay())
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { label: DAYS[date.getDay()], date: date.getDate(), isToday: date.toDateString() === today.toDateString() }
  })
  const month = today.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <Card>
      <div className="flex items-baseline justify-between px-(--card-spacing)">
        <h2 className="font-display text-base font-semibold">Calendar</h2>
        <span className="text-xs text-muted-foreground">{month} · {classCount} class{classCount === 1 ? '' : 'es'} today</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 px-(--card-spacing)">
        {days.map((day) => (
          <div
            key={`${day.label}-${day.date}`}
            aria-current={day.isToday ? 'date' : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-full border py-2 text-xs ${day.isToday ? 'border-transparent bg-primary text-primary-foreground shadow-[0_0_24px_-4px] shadow-primary/70' : 'border-border text-muted-foreground'}`}
          >
            <span>{day.label}</span>
            <span className="text-sm font-semibold">{String(day.date).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
