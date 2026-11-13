'use client'

import { useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Save, Search, Trash2, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/app/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MemberAccessFields, emptyAccess, type AccessState } from '@/components/app/member-access-fields'
import { createClient } from '@/lib/supabase/client'
import { trackProductEvent } from '@/lib/product-events'

type Student = { id: string; full_name: string; student_code: string; batch: string | null; guardian_name: string | null; guardian_phone: string | null; fee_status: 'paid' | 'pending' | 'overdue'; attendance: number }
type BatchOption = { id: string; name: string }
type FormState = { full_name: string; student_code: string; batchChoice: string; newBatchName: string; guardian_name: string; guardian_phone: string }

const NEW_BATCH = '__new__'
const emptyForm: FormState = { full_name: '', student_code: '', batchChoice: '', newBatchName: '', guardian_name: '', guardian_phone: '' }

// Reads a row even if some optional columns do not exist in the database.
function normaliseStudent(row: Record<string, unknown>): Student {
  const fee = String(row.fee_status ?? 'pending')
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    student_code: String(row.student_code ?? ''),
    batch: (row.batch as string | null | undefined) ?? null,
    guardian_name: (row.guardian_name as string | null | undefined) ?? null,
    guardian_phone: (row.guardian_phone as string | null | undefined) ?? null,
    fee_status: fee === 'paid' || fee === 'overdue' ? fee : 'pending',
    attendance: Number(row.attendance ?? 0) || 0,
  }
}

async function callMembers(method: 'POST' | 'PATCH' | 'DELETE' | 'GET', body?: unknown, query = '') {
  const response = await fetch(`/api/members${query}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!response.ok) throw new Error(result.error ?? 'Something went wrong.')
  return result
}
function initials(name: string) { return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() }

export default function StudentsPage() {
  const supabase = createClient()
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [initialChoice, setInitialChoice] = useState('')
  const [legacyBatch, setLegacyBatch] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maxStudents, setMaxStudents] = useState<number | null>(null)
  const [access, setAccess] = useState<AccessState>(emptyAccess('student'))
  const [hasLogin, setHasLogin] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  useEffect(() => {
    async function loadLimit() {
      const orgId = await supabase.rpc('current_user_organization_id')
      if (orgId.error || !orgId.data) return
      const { data: org } = await supabase.from('organizations').select('max_students').eq('id', orgId.data).maybeSingle()
      setMaxStudents(org?.max_students ?? null)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(); setIsOwner(me?.role === 'owner') }
    }
    void loadLimit()
  }, [])
  async function loadStudents() {
    setLoading(true)
    let result = await supabase.from('students').select('*').order('created_at', { ascending: false })
    if (result.error) result = await supabase.from('students').select('*') // the table may have no created_at column
    if (result.error) {
      console.error('[students] could not load', result.error)
      toast.error(`Unable to load students: ${result.error.message}`)
    }
    setStudents(((result.data ?? []) as Record<string, unknown>[]).map(normaliseStudent))
    setLoading(false)
  }
  async function loadBatches() {
    const { data, error } = await supabase.from('batches').select('id, name')
    if (error) { console.error('[students] could not load batches', error); return }
    setBatches(((data ?? []) as BatchOption[]).map((batch) => ({ id: String(batch.id), name: String(batch.name ?? '') })).sort((a, b) => a.name.localeCompare(b.name)))
  }
  useEffect(() => { void loadStudents(); void loadBatches() }, [])

  function startCreate() { setEditingId(null); setForm(emptyForm); setInitialChoice(''); setLegacyBatch(null); setAccess(emptyAccess('student')); setHasLogin(true); setOpen(true) }
  async function startEdit(s: Student) {
    const match = batches.find((batch) => batch.name === s.batch)
    const choice = match?.id ?? ''
    setEditingId(s.id)
    setForm({ full_name: s.full_name, student_code: s.student_code, batchChoice: choice, newBatchName: '', guardian_name: s.guardian_name ?? '', guardian_phone: s.guardian_phone ?? '' })
    setInitialChoice(choice)
    setLegacyBatch(s.batch && !match ? s.batch : null)
    setAccess(emptyAccess('student')); setHasLogin(true); setOpen(true)
    try {
      const current = await callMembers('GET', undefined, `?kind=student&id=${s.id}`)
      setHasLogin(current.hasLogin === true)
      setAccess({ email: String(current.email ?? ''), password: '', isAdmin: current.isAdmin === true, permissions: current.permissions as AccessState['permissions'] })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load access settings') }
  }
  async function saveStudent(event: React.FormEvent) {
    event.preventDefault(); setSaving(true)
    try {
      const details = { full_name: form.full_name.trim(), student_code: form.student_code.trim().toUpperCase(), guardian_name: form.guardian_name.trim() || null, guardian_phone: form.guardian_phone.trim() || null }
      if (details.full_name.length < 2 || details.student_code.length < 2) throw new Error('Enter a valid name and student code')
      const creatingBatch = form.batchChoice === NEW_BATCH
      if (creatingBatch && form.newBatchName.trim().length < 2) throw new Error('Enter a name for the new batch')
      const batchId = creatingBatch ? '' : form.batchChoice
      const newBatchName = creatingBatch ? form.newBatchName.trim() : ''

      if (!editingId) {
        const result = await callMembers('POST', { kind: 'student', fullName: details.full_name, studentCode: details.student_code, batchId, newBatchName, guardianName: details.guardian_name, guardianPhone: details.guardian_phone, email: access.email, password: access.password, isAdmin: access.isAdmin, permissions: access.permissions })
        void trackProductEvent(supabase, 'student_created', { eventKey: `student:${Date.now()}`, metadata: { has_guardian: Boolean(details.guardian_name) } })
        toast.success(result.createdBatch ? `Student added. New batch "${String(result.batch)}" created.` : 'Student added. They can now log in with the email and password you set.')
        if (typeof result.warning === 'string' && result.warning) toast.warning(result.warning)
      } else {
        const { error } = await supabase.from('students').update(details).eq('id', editingId)
        if (error) throw new Error(error.code === '23505' ? 'That student code already exists' : `Unable to save student: ${error.message}`)
        if (hasLogin) await callMembers('PATCH', { kind: 'student', id: editingId, fullName: details.full_name, permissions: access.permissions, ...(isOwner ? { isAdmin: access.isAdmin } : {}), ...(access.password ? { newPassword: access.password } : {}) })
        if (creatingBatch || form.batchChoice !== initialChoice) {
          const response = await fetch('/api/students/batch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ studentId: editingId, batchId, newBatchName }) })
          const result = (await response.json().catch(() => ({}))) as { error?: string; warning?: string | null; createdBatch?: boolean; batch?: string | null }
          if (!response.ok) throw new Error(result.error ?? 'Could not change the batch')
          if (result.createdBatch) toast.success(`New batch "${result.batch}" created`)
          if (result.warning) toast.warning(result.warning)
        }
        toast.success('Student updated')
      }
      setOpen(false); setForm(emptyForm); setAccess(emptyAccess('student')); await Promise.all([loadStudents(), loadBatches()])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save student') }
    setSaving(false)
  }
  async function removeStudent(id: string) {
    if (!window.confirm('Remove this student? Their login will stop working.')) return
    try { await callMembers('DELETE', undefined, `?kind=student&id=${id}`); toast.success('Student removed'); await loadStudents() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to remove student') }
  }
  const filtered = students.filter((s) => `${s.full_name} ${s.student_code} ${s.batch ?? ''} ${s.guardian_name ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const atLimit = maxStudents !== null && students.length >= maxStudents
  return <div className="flex flex-col gap-6">
    <PageHeader title="Students" description="Manage enrollments, profiles and guardian contacts."><Button onClick={startCreate} disabled={atLimit}><Plus data-icon="inline-start" />Add student</Button></PageHeader>
    {maxStudents !== null && <p className="text-sm text-muted-foreground">{students.length} of {maxStudents} student seats used{atLimit && ' — upgrade your plan to add more'}</p>}
    {open && <Card><CardHeader><CardTitle>{editingId ? 'Edit student' : 'Add student'}</CardTitle><CardDescription>Student records are private to your organization.</CardDescription></CardHeader><CardContent><form onSubmit={saveStudent} className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="student-name">Full name</Label><Input id="student-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div><div className="grid gap-2"><Label htmlFor="student-code">Student code</Label><Input id="student-code" required value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="student-batch">Batch</Label><select id="student-batch" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.batchChoice} onChange={(e) => setForm({ ...form, batchChoice: e.target.value, newBatchName: '' })}><option value="">No batch yet</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}<option value={NEW_BATCH}>＋ Create a new batch…</option></select>{form.batchChoice === NEW_BATCH && <Input autoFocus placeholder="New batch name, e.g. Class 10 Maths" value={form.newBatchName} onChange={(e) => setForm({ ...form, newBatchName: e.target.value })} />}<p className="text-xs text-muted-foreground">{form.batchChoice === NEW_BATCH ? 'This batch will be created and appear on the Batches page.' : legacyBatch ? `Currently "${legacyBatch}", which is not in your batch list. Choose a batch to move them.` : 'Pick an existing batch, or create a new one.'}</p></div>
      <div className="grid gap-2"><Label htmlFor="guardian-name">Guardian name</Label><Input id="guardian-name" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} /></div><div className="grid gap-2"><Label htmlFor="guardian-phone">Guardian phone</Label><Input id="guardian-phone" value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} /></div>{hasLogin ? <MemberAccessFields kind="student" value={access} onChange={setAccess} editing={Boolean(editingId)} canGrantAdmin={isOwner} /> : <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">This student was added before logins existed, so they have no login yet. Remove and add them again to give them one.</p>}<div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}{editingId ? 'Save changes' : 'Add student'}</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}><X data-icon="inline-start" />Cancel</Button></div></form></CardContent></Card>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search students..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} /></div><p className="text-sm text-muted-foreground"><Users className="mr-1 inline size-4 align-text-bottom" />{filtered.length} students shown</p></div>
    {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" />Loading students…</div> : <Card className="overflow-hidden p-0"><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Batch</TableHead><TableHead>Guardian</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead>Fees</TableHead><TableHead className="text-right">Attendance</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((s) => <TableRow key={s.id}><TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="text-xs">{initials(s.full_name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium">{s.full_name}</p><p className="truncate text-xs text-muted-foreground">{s.student_code}</p></div></div></TableCell><TableCell className="text-muted-foreground">{s.batch ?? '—'}</TableCell><TableCell className="text-muted-foreground">{s.guardian_name ?? '—'}</TableCell><TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{s.guardian_phone ?? '—'}</TableCell><TableCell><StatusBadge status={s.fee_status} /></TableCell><TableCell className="text-right tabular-nums">{s.attendance}%</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Edit ${s.full_name}`} onClick={() => void startEdit(s)}><Pencil /></Button><Button size="icon" variant="ghost" aria-label={`Remove ${s.full_name}`} onClick={() => removeStudent(s.id)}><Trash2 /></Button></div></TableCell></TableRow>)}{filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No students found.</TableCell></TableRow>}</TableBody></Table></Card>}
  </div>
}
