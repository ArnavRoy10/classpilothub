import Link from 'next/link'
import { ArrowRight, GraduationCap, Users, Wallet, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { AttendanceDial } from '@/components/app/attendance-dial'

type StatCardsProps = {
  studentCount: number
  attendanceRate: number | null
  presentToday?: number
  markedToday?: number
  pendingFeesTotal: number
  monthlyCollected: number
  attendanceHref?: string
}

function Tile({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-(--card-spacing)">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="px-(--card-spacing)">
        <p className="truncate font-display text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  )
}

export function StatCards({ studentCount, attendanceRate, presentToday = 0, markedToday = 0, pendingFeesTotal, monthlyCollected, attendanceHref }: StatCardsProps) {
  const absent = Math.max(0, markedToday - presentToday)
  const money = (value: number) => `₹${value.toLocaleString('en-IN')}`

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="sm:col-span-2">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-(--card-spacing)">
          <div className="mx-auto w-52 shrink-0 sm:mx-0">
            <AttendanceDial rate={attendanceRate} />
          </div>
          <div className="grid min-w-44 flex-1 gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="size-4" aria-hidden />
                Total students
              </p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-tight">{studentCount}</p>
              <p className="text-xs text-muted-foreground">{studentCount === 0 ? 'No students yet' : 'enrolled'}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary">Present {presentToday}</span>
              <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">Absent {absent}</span>
            </div>
            {attendanceHref && (
              <Link href={attendanceHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                {attendanceRate === null ? 'Mark attendance' : 'Update attendance'}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </Card>
      <Tile icon={GraduationCap} label="Pending Fees" value={money(pendingFeesTotal)} hint={pendingFeesTotal === 0 ? 'All caught up' : 'outstanding'} />
      <Tile icon={Wallet} label="Collected This Month" value={money(monthlyCollected)} hint="this calendar month" />
    </div>
  )
}
