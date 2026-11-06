'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PLANS, PLAN_ORDER } from '@/lib/plans'
import { addFreeDays, makeFree, removeFree, resetMemberPassword, setMemberRole, setPlanAndLimits, suspendNow, updateOrganization, type ActionResult } from '@/app/founder/actions'

const selectClass = 'border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm'

function useAction() {
  const [pending, start] = useTransition()
  const run = (action: () => Promise<ActionResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    start(async () => {
      const result = await action()
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }
  return { pending, run }
}

type Org = { id: string; name: string; type: string; plan: string; max_students: number; max_teachers: number }

export function OrganizationControls({ org }: { org: Org }) {
  const { pending, run } = useAction()
  const [name, setName] = useState(org.name)
  const [type, setType] = useState(org.type)
  const [plan, setPlan] = useState(PLAN_ORDER.includes(org.plan as never) ? org.plan : 'starter')
  const [maxStudents, setMaxStudents] = useState(String(org.max_students ?? ''))
  const [maxTeachers, setMaxTeachers] = useState(String(org.max_teachers ?? ''))
  const [days, setDays] = useState('30')
  const [freePlan, setFreePlan] = useState(PLAN_ORDER.includes(org.plan as never) ? org.plan : 'starter')

  function choosePlan(next: string) {
    setPlan(next)
    const preset = PLANS[next as keyof typeof PLANS]
    if (preset) { setMaxStudents(String(preset.maxStudents)); setMaxTeachers(String(preset.maxTeachers)) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Organisation details</CardTitle><CardDescription>Edit the name and type shown across the product.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="org-name">Name</Label><Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="org-type">Type</Label>
            <select id="org-type" className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="coaching_center">Coaching center</option><option value="solo_tutor">Solo tutor</option>
            </select>
          </div>
          <div><Button disabled={pending} onClick={() => run(() => updateOrganization(org.id, { name, type }))}>Save details</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plan and permissions</CardTitle><CardDescription>Set the plan and exactly how many students and teachers this organisation may have.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2"><Label htmlFor="org-plan">Plan</Label>
            <select id="org-plan" className={selectClass} value={plan} onChange={(e) => choosePlan(e.target.value)}>
              {PLAN_ORDER.map((id) => <option key={id} value={id}>{PLANS[id].name} — {PLANS[id].limits}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="max-students">Max students</Label><Input id="max-students" type="number" min={0} value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="max-teachers">Max teachers</Label><Input id="max-teachers" type="number" min={0} value={maxTeachers} onChange={(e) => setMaxTeachers(e.target.value)} /></div>
          </div>
          <div><Button disabled={pending} onClick={() => run(() => setPlanAndLimits(org.id, { plan, maxStudents: Number(maxStudents), maxTeachers: Number(maxTeachers) }))}>Save plan and limits</Button></div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Free access and billing</CardTitle><CardDescription>Give free days, make the organisation free, or end it. Every change is written to the audit log.</CardDescription></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="grid content-start gap-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Give free days</p>
            <p className="text-xs text-muted-foreground">Adds days from today (or from the current end date if later). Also reactivates a suspended organisation.</p>
            <div className="flex items-center gap-2"><Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} className="w-24" /><span className="text-sm text-muted-foreground">days</span></div>
            <Button disabled={pending} onClick={() => run(() => addFreeDays(org.id, Number(days)))}>Add free days</Button>
          </div>
          <div className="grid content-start gap-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Make organisation free</p>
            <p className="text-xs text-muted-foreground">Active until 2099 on the chosen plan. No payment is ever asked.</p>
            <select className={selectClass} value={freePlan} onChange={(e) => setFreePlan(e.target.value)}>
              {PLAN_ORDER.map((id) => <option key={id} value={id}>{PLANS[id].name}</option>)}
            </select>
            <Button disabled={pending} onClick={() => run(() => makeFree(org.id, freePlan), 'Make this organisation free?')}>Make free</Button>
          </div>
          <div className="grid content-start gap-3 rounded-lg border border-destructive/30 p-4">
            <p className="text-sm font-medium">End access</p>
            <p className="text-xs text-muted-foreground">Remove free access (payment due, 4-day grace) or put the organisation straight into view-only mode.</p>
            <Button variant="outline" disabled={pending} onClick={() => run(() => removeFree(org.id), 'Remove free access? Payment becomes due now.')}>Remove free access</Button>
            <Button variant="destructive" disabled={pending} onClick={() => run(() => suspendNow(org.id), 'Suspend this organisation now? It becomes view-only immediately.')}>Suspend now</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type Member = { id: string; full_name: string | null; email: string | null; role: string }

export function MemberRow({ orgId, member }: { orgId: string; member: Member }) {
  const { pending, run } = useAction()
  const [role, setRole] = useState(member.role)
  const [password, setPassword] = useState('')

  return (
    <tr className="border-t border-border align-top">
      <td className="py-3 pr-4"><p className="font-medium">{member.full_name ?? '—'}</p><p className="text-xs text-muted-foreground">{member.email ?? '—'}</p></td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <select className={`${selectClass} w-32`} value={role} onChange={(e) => setRole(e.target.value)}>
            {['owner', 'admin', 'teacher', 'student', 'parent'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={pending || role === member.role} onClick={() => run(() => setMemberRole(orgId, member.id, role), `Change role to ${role}?`)}>Save</Button>
        </div>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <Input type="text" autoComplete="off" placeholder="New password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-52" />
          <Button size="sm" variant="outline" disabled={pending || password.length < 8} onClick={() => run(async () => { const result = await resetMemberPassword(orgId, member.id, password); if (result.ok) setPassword(''); return result })}>Reset</Button>
        </div>
      </td>
    </tr>
  )
}
