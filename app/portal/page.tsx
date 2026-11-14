import Link from 'next/link'
import { ArrowRight, BarChart3, CalendarCheck, CalendarDays, Clock, Megaphone, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserContext } from '@/lib/supabase/user-context'
import { createClient } from '@/lib/supabase/server'
import { PortalGreeting } from '@/components/portal/portal-greeting'
import { ProgressRing } from '@/components/portal/progress-ring'
import { EmptyState, PortalTable, StatCard, StatusPill, formatDate, formatTime, money } from '@/components/portal/portal-shell'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function PortalPage() {
  const context = (await getUserContext())!
  const supabase = await createClient()
  const allow = (key: string) => context.permissions[key] !== false

  // "Today" in Indian time, whatever time zone the server runs in.
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' })
  const nowTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)

  const [{ data: links }, { data: profile }] = await Promise.all([
    supabase.from('parent_student_links').select('student_id').eq('parent_profile_id', context.userId),
    supabase.from('profiles').select('student_id').eq('id', context.userId).maybeSingle(),
  ])
  const ids = [...new Set([...(links ?? []).map((x) => x.student_id), ...(profile?.student_id ? [profile.student_id] : [])])]
  const { data: students } = ids.length ? await supabase.from('students').select('id,full_name,student_code').in('id', ids) : { data: [] as { id: string; full_name: string; student_code: string }[] }
  const studentIds = (students ?? []).map((s) => s.id)

  const none = Promise.resolve({ data: [] as any[] })
  const [{ data: attendance }, { data: results }, { data: fees }, { data: memberships }, { data: announcements }] = await Promise.all([
    studentIds.length && allow('attendance') ? supabase.from('attendance').select('status').in('student_id', studentIds) : none,
    studentIds.length && allow('results') ? supabase.from('results').select('student_id,marks_obtained,test_id,tests(name,subject,max_marks,test_date)').in('student_id', studentIds) : none,
    studentIds.length && allow('fees') ? supabase.from('student_fees').select('student_id,amount,status,due_date').in('student_id', studentIds) : none,
    studentIds.length && allow('timetable') ? supabase.from('batch_students').select('batch_id').in('student_id', studentIds) : none,
    allow('announcements') ? supabase.from('announcements').select('id,title,message,publish_at').eq('status', 'published').order('publish_at', { ascending: false }).limit(3) : none,
  ])

  // Today's classes: plain queries, matched up here (no joins).
  const batchIds = [...new Set((memberships ?? []).map((m: any) => m.batch_id))]
  const batchResult = batchIds.length ? await supabase.from('batches').select('id,name').in('id', batchIds) : { data: [] as any[] }
  const scheduleResult = batchIds.length ? await supabase.from('schedules').select('*').in('batch_id', batchIds) : { data: [] as any[] }
  const teacherIds = [...new Set((scheduleResult.data ?? []).map((s: any) => s.teacher_id).filter(Boolean))]
  const teacherResult = teacherIds.length ? await supabase.from('teachers').select('id,full_name').in('id', teacherIds) : { data: [] as any[] }
  const batchNames = new Map<string, string>((batchResult.data ?? []).map((b: any) => [b.id, b.name]))
  const teacherNames = new Map<string, string>((teacherResult.data ?? []).map((t: any) => [t.id, t.full_name]))

  const todaysClasses = (scheduleResult.data ?? [])
    .filter((slot: any) => slot.day_of_week === weekday || slot.day_of_week === DAYS.indexOf(weekday))
    .map((slot: any) => ({
      id: String(slot.id),
      start: String(slot.start_time ?? '').slice(0, 5),
      end: String(slot.end_time ?? '').slice(0, 5),
      subject: String(slot.subject ?? 'Class'),
      batch: batchNames.get(slot.batch_id) ?? 'Batch',
      teacher: teacherNames.get(slot.teacher_id) ?? '',
      room: slot.room ? String(slot.room) : '',
    }))
    .sort((a: { start: string }, b: { start: string }) => a.start.localeCompare(b.start))

  const totalAttendance = attendance?.length ?? 0
  const present = attendance?.filter((x: any) => x.status === 'present').length ?? 0
  const attendancePercent = totalAttendance ? Math.round((present / totalAttendance) * 100) : null
  const outstanding = (fees ?? []).filter((f: any) => f.status !== 'paid').reduce((sum: number, f: any) => sum + Number(f.amount), 0)
  const nextClass = todaysClasses.find((slot: { end: string }) => slot.end > nowTime)

  const primary = students?.[0]
  const subtitle = context.role === 'parent'
    ? 'A secure view of your linked students.'
    : batchNames.size ? `You are in ${[...batchNames.values()].join(', ')}.` : 'Your learning, attendance and updates in one place.'
  const shortcuts = [
    { key: 'attendance', label: 'My attendance', href: '/portal/attendance' },
    { key: 'results', label: 'My results', href: '/portal/results' },
    { key: 'timetable', label: 'Timetable', href: '/portal/timetable' },
    { key: 'fees', label: 'Fees', href: '/portal/fees' },
  ].filter((link) => allow(link.key))

  return (
    <div className="flex flex-col gap-6">
      <PortalGreeting name={primary?.full_name ?? context.fullName} subtitle={subtitle} links={shortcuts} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {allow('attendance') && <StatCard icon={CalendarCheck} label="Attendance" value={attendancePercent === null ? '—' : `${attendancePercent}%`} detail={totalAttendance ? `${present} of ${totalAttendance} days present` : 'Nothing recorded yet'} />}
        {allow('timetable') && <StatCard icon={Clock} label="Next class" value={nextClass ? nextClass.start : '—'} detail={nextClass ? `${nextClass.subject} · ${nextClass.batch}` : 'No more classes today'} />}
        {allow('results') && <StatCard icon={BarChart3} label="Results" value={String(results?.length ?? 0)} detail="published so far" />}
        {allow('fees') && <StatCard icon={Wallet} label="Fees to pay" value={money(outstanding)} detail={outstanding === 0 ? 'All caught up' : 'outstanding'} />}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          {allow('timetable') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />Today&apos;s classes</CardTitle>
                <CardDescription>{weekday}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {todaysClasses.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No classes scheduled for today.</p> : todaysClasses.map((slot: any) => {
                  const state = slot.end <= nowTime ? 'Done' : slot.start <= nowTime ? 'Now' : 'Upcoming'
                  return (
                    <div key={slot.id} className={`flex items-center gap-4 rounded-xl border p-3 ${state === 'Now' ? 'border-primary/50 bg-primary/10' : 'border-border'} ${state === 'Done' ? 'opacity-60' : ''}`}>
                      <div className="w-20 shrink-0 text-center"><p className="font-display text-lg font-semibold leading-none">{slot.start}</p><p className="mt-1 text-[11px] text-muted-foreground">to {slot.end}</p></div>
                      <div className="min-w-0 flex-1"><p className="truncate font-medium">{slot.subject}</p><p className="truncate text-xs text-muted-foreground">{slot.batch}{slot.teacher ? ` · ${slot.teacher}` : ''}{slot.room ? ` · Room ${slot.room}` : ''}</p></div>
                      <StatusPill>{state}</StatusPill>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {allow('announcements') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="size-4 text-primary" />Latest announcements</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {(announcements ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No announcements yet.</p> : (announcements ?? []).map((item: any) => (
                  <article key={item.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3"><h3 className="font-medium">{item.title}</h3><span className="shrink-0 text-xs text-muted-foreground">{formatDate(item.publish_at)}</span></div>
                    <p className="mt-2 line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">{item.message}</p>
                  </article>
                ))}
                <Link href="/portal/announcements" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">All announcements<ArrowRight className="size-4" /></Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {allow('attendance') && (
            <Card>
              <CardHeader><CardTitle>Attendance</CardTitle><CardDescription>Across all recorded days</CardDescription></CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  <p><span className="font-semibold text-foreground">{present}</span> present</p>
                  <p><span className="font-semibold text-foreground">{Math.max(0, totalAttendance - present)}</span> other</p>
                  <Link href="/portal/attendance" className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">View details<ArrowRight className="size-3.5" /></Link>
                </div>
                <ProgressRing id="portal-attendance" value={attendancePercent} label="present" />
              </CardContent>
            </Card>
          )}

          {allow('results') && (
            <Card>
              <CardHeader><CardTitle>Recent results</CardTitle></CardHeader>
              <CardContent>
                {results?.length ? <PortalTable headers={['Test', 'Score']} rows={results.slice(0, 5).map((r: any) => [<div key={r.test_id}><p className="font-medium">{r.tests?.name ?? 'Test'}</p><p className="text-xs text-muted-foreground">{r.tests?.subject ?? '—'} · {formatDate(r.tests?.test_date)}</p></div>, <StatusPill key={`${r.test_id}-score`}>{r.marks_obtained}/{r.tests?.max_marks ?? '—'}</StatusPill>])} /> : <EmptyState text="Published results will appear here." />}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {(context.role === 'parent' || (students?.length ?? 0) > 1) && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Linked students</h2>
          {students?.length ? <PortalTable headers={['Student', 'Code']} rows={students.map((s) => [<span className="font-medium" key={s.id}>{s.full_name}</span>, s.student_code || '—'])} /> : <EmptyState text="No student profile is linked to this account yet." />}
        </section>
      )}
    </div>
  )
}
