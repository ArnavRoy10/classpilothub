import Link from 'next/link'
import { ArrowRight, CalendarCheck, Clock, Layers, Megaphone, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/app/page-header'
import { GreetingCard } from '@/components/app/greeting-card'
import { WeekStrip } from '@/components/app/week-strip'
import { AiAssistant } from '@/components/app/ai-assistant'
import { getAdminClient } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'
import type { UserContext } from '@/lib/supabase/user-context'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Tile({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 px-(--card-spacing)">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="size-4" aria-hidden /></span>
      </div>
      <div className="px-(--card-spacing)">
        <p className="truncate font-display text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </Card>
  )
}

// What a teacher sees instead of the owner's dashboard: their own batches, classes and tasks.
// Data is read on the server and strictly limited to this teacher's own records and organisation.
export async function TeacherDashboard({ context }: { context: UserContext }) {
  const admin = getAdminClient()
  const orgId = context.organization.id
  const can = (key: string) => hasPermission(context, key)

  // "Today" in Indian time, whatever time zone the server runs in.
  const now = new Date()
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' })
  const nowTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)

  const { data: teacher } = await admin.from('teachers').select('id, full_name, subject').eq('organization_id', orgId).eq('email', context.email.toLowerCase()).maybeSingle()

  if (!teacher) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Teaching dashboard" description={`Welcome, ${context.fullName}.`} />
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Your teacher profile isn&apos;t linked to this login yet. Ask your center owner to check your email address under Teachers.</CardContent></Card>
      </div>
    )
  }

  const [batchResult, scheduleResult, announcementResult] = await Promise.all([
    admin.from('batches').select('*').eq('organization_id', orgId).eq('teacher_id', teacher.id),
    admin.from('schedules').select('*').eq('organization_id', orgId).eq('teacher_id', teacher.id),
    can('announcements') ? admin.from('announcements').select('id, title, message, publish_at').eq('organization_id', orgId).eq('status', 'published').order('publish_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  const myBatches = (batchResult.data ?? []) as Record<string, unknown>[]
  const mySlots = (scheduleResult.data ?? []) as Record<string, unknown>[]
  const slotBatchIds = [...new Set(mySlots.map((slot) => String(slot.batch_id ?? '')).filter(Boolean))]
  const allBatchIds = [...new Set([...myBatches.map((batch) => String(batch.id)), ...slotBatchIds])]

  const [namesResult, linkResult, markedResult] = allBatchIds.length
    ? await Promise.all([
        admin.from('batches').select('id, name').in('id', allBatchIds),
        admin.from('batch_students').select('batch_id, student_id').in('batch_id', allBatchIds),
        admin.from('attendance').select('batch_id').eq('organization_id', orgId).eq('date', todayStr).in('batch_id', allBatchIds),
      ])
    : [{ data: [] as Record<string, unknown>[] }, { data: [] as Record<string, unknown>[] }, { data: [] as Record<string, unknown>[] }]

  const batchNames = new Map<string, string>((namesResult.data ?? []).map((batch) => [String(batch.id), String(batch.name ?? '')]))
  const links = (linkResult.data ?? []) as { batch_id: string; student_id: string }[]
  const markedBatches = new Set((markedResult.data ?? []).map((row) => String(row.batch_id)))
  const myBatchIds = new Set(myBatches.map((batch) => String(batch.id)))
  const myStudentIds = new Set(links.filter((link) => myBatchIds.has(link.batch_id)).map((link) => link.student_id))

  const todaysClasses = mySlots
    .filter((slot) => slot.day_of_week === weekday || slot.day_of_week === DAYS.indexOf(weekday))
    .map((slot) => ({
      id: String(slot.id),
      batchId: String(slot.batch_id ?? ''),
      start: String(slot.start_time ?? '').slice(0, 5),
      end: String(slot.end_time ?? '').slice(0, 5),
      subject: String(slot.subject ?? 'Class'),
      room: slot.room ? String(slot.room) : '',
    }))
    .sort((a, b) => a.start.localeCompare(b.start))

  const dueBatches = [...new Set(todaysClasses.map((slot) => slot.batchId))].filter((batchId) => batchId && !markedBatches.has(batchId))
  const nextClass = todaysClasses.find((slot) => slot.end > nowTime)

  const quickActions = [
    { key: 'attendance', label: 'Mark attendance', href: '/attendance' },
    { key: 'tests', label: 'Create a test', href: '/tests' },
    { key: 'results', label: 'Enter results', href: '/results' },
    { key: 'announcements', label: 'Post notice', href: '/announcements' },
  ].filter((action) => can(action.key))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Teaching dashboard" description={`${teacher.subject ? `${teacher.subject} · ` : ''}Your classes, batches and tasks for today.`} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={Layers} label="My batches" value={String(myBatches.length)} hint={myBatches.length === 0 ? 'None assigned yet' : 'assigned to you'} />
            <Tile icon={Users} label="My students" value={String(myStudentIds.size)} hint="across your batches" />
            <Tile icon={Clock} label="Classes today" value={String(todaysClasses.length)} hint={nextClass ? `Next at ${nextClass.start}` : 'None left today'} />
            <Tile icon={CalendarCheck} label="Marking due" value={String(dueBatches.length)} hint={dueBatches.length === 0 ? 'All marked' : 'batches to mark'} />
          </div>

          <Card>
            <CardHeader><CardTitle>Today&apos;s classes</CardTitle><CardDescription>{weekday}</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {todaysClasses.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No classes scheduled for you today.</p> : todaysClasses.map((slot) => {
                const state = slot.end <= nowTime ? 'Done' : slot.start <= nowTime ? 'Now' : 'Upcoming'
                const marked = markedBatches.has(slot.batchId)
                return (
                  <div key={slot.id} className={`flex flex-wrap items-center gap-4 rounded-xl border p-3 ${state === 'Now' ? 'border-primary/50 bg-primary/10' : 'border-border'} ${state === 'Done' ? 'opacity-70' : ''}`}>
                    <div className="w-20 shrink-0 text-center"><p className="font-display text-lg font-semibold leading-none">{slot.start}</p><p className="mt-1 text-[11px] text-muted-foreground">to {slot.end}</p></div>
                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{slot.subject}</p><p className="truncate text-xs text-muted-foreground">{batchNames.get(slot.batchId) ?? 'Batch'}{slot.room ? ` · Room ${slot.room}` : ''}</p></div>
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">{state}</span>
                    {can('attendance') && (marked
                      ? <span className="text-xs text-muted-foreground">Attendance marked</span>
                      : <Link href="/attendance" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Mark attendance<ArrowRight className="size-3.5" /></Link>)}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>My batches</CardTitle></CardHeader>
            <CardContent>
              {myBatches.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No batches are assigned to you yet. Your owner can assign you from the Batches page.</p> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {myBatches.map((batch) => {
                    const students = links.filter((link) => link.batch_id === String(batch.id)).length
                    const capacity = Number(batch.capacity ?? 0)
                    return (
                      <div key={String(batch.id)} className="rounded-xl border border-border p-4">
                        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{String(batch.name ?? 'Batch')}</p><p className="truncate text-xs text-muted-foreground">{String(batch.level ?? '')}</p></div><Layers className="size-4 shrink-0 text-primary" /></div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{students}{capacity ? ` / ${capacity}` : ''} students</span><span className="truncate pl-2">{String(batch.schedule ?? '')}</span></div>
                        {capacity > 0 && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (students / capacity) * 100)}%` }} /></div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="order-first flex flex-col gap-4 xl:order-none">
          <GreetingCard name={context.fullName} orgName={context.organization.name} actions={quickActions} />
          <WeekStrip todayStr={todayStr} classCount={todaysClasses.length} />
          {can('announcements') && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="size-4 text-primary" />Latest announcements</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-3">
                {(announcementResult.data ?? []).length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No announcements yet.</p> : (announcementResult.data ?? []).map((item) => (
                  <article key={String(item.id)} className="rounded-xl border border-border p-3">
                    <h3 className="text-sm font-medium">{String(item.title ?? '')}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{String(item.message ?? '')}</p>
                  </article>
                ))}
              </CardContent>
            </Card>
          )}
          <AiAssistant />
        </div>
      </div>
    </div>
  )
}
