'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Loader2, Pencil, Phone, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/app/status-badge'
import { MemberAccessFields, emptyAccess, type AccessState } from '@/components/app/member-access-fields'
import { createClient } from '@/lib/supabase/client'

type Teacher = { id: string; full_name: string; email: string; phone: string | null; subject: string; status: 'active' | 'inactive' }
type FormState = { full_name: string; phone: string; subject: string; status: 'active' | 'inactive' }
const emptyForm: FormState = { full_name: '', phone: '', subject: '', status: 'active' }

// Reads a row even if some optional columns do not exist in the database.
function normaliseTeacher(row: Record<string, unknown>): Teacher {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    phone: (row.phone as string | null | undefined) ?? null,
    subject: String(row.subject ?? ''),
    status: row.status === 'inactive' ? 'inactive' : 'active',
  }
}

function initials(name: string) { return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() }

async function callMembers(method: 'POST' | 'PATCH' | 'DELETE' | 'GET', body?: unknown, query = '') {
  const response = await fetch(`/api/members${query}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!response.ok) throw new Error(result.error ?? 'Something went wrong.')
  return result
}

export default function TeachersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [access, setAccess] = useState<AccessState>(emptyAccess('teacher'))
  const [hasLogin, setHasLogin] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maxTeachers, setMaxTeachers] = useState<number | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)

  useEffect(() => {
    async function checkAccess() {
      const orgId = await supabase.rpc('current_user_organization_id')
      if (orgId.error || !orgId.data) { setCheckingAccess(false); return }
      const { data: org } = await supabase.from('organizations').select('type, max_teachers').eq('id', orgId.data).maybeSingle()
      if (org?.type === 'solo_tutor') { router.replace('/dashboard'); return }
      setMaxTeachers(org?.max_teachers ?? null)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        setIsOwner(me?.role === 'owner')
      }
      setCheckingAccess(false)
    }
    void checkAccess()
  }, [])

  async function loadTeachers() {
    setLoading(true)
    let result = await supabase.from('teachers').select('*').order('created_at', { ascending: false })
    if (result.error) result = await supabase.from('teachers').select('*') // the table may have no created_at column
    if (result.error) {
      console.error('[teachers] could not load', result.error)
      toast.error(`Unable to load teachers: ${result.error.message}`)
    }
    setTeachers(((result.data ?? []) as Record<string, unknown>[]).map(normaliseTeacher))
    setLoading(false)
  }
  useEffect(() => { void loadTeachers() }, [])

  function startCreate() {
    setEditingId(null); setForm(emptyForm); setAccess(emptyAccess('teacher')); setHasLogin(true); setOpen(true)
  }

  async function startEdit(t: Teacher) {
    setEditingId(t.id)
    setForm({ full_name: t.full_name, phone: t.phone ?? '', subject: t.subject, status: t.status })
    setAccess({ ...emptyAccess('teacher'), email: t.email })
    setHasLogin(true)
    setOpen(true)
    try {
      const current = await callMembers('GET', undefined, `?kind=teacher&id=${t.id}`)
      setHasLogin(current.hasLogin === true)
      setAccess({ email: t.email, password: '', isAdmin: current.isAdmin === true, permissions: current.permissions as AccessState['permissions'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load access settings')
    }
  }

  async function saveTeacher(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const fullName = form.full_name.trim()
      const subject = form.subject.trim()
      if (fullName.length < 2 || subject.length < 2) throw new Error('Enter a valid name and subject')

      if (!editingId) {
        await callMembers('POST', { kind: 'teacher', fullName, subject, phone: form.phone, email: access.email, password: access.password, isAdmin: access.isAdmin, permissions: access.permissions })
        toast.success('Teacher added. They can now log in with the email and password you set.')
      } else {
        const { error } = await supabase.from('teachers').update({ full_name: fullName, phone: form.phone.trim() || null, subject, status: form.status }).eq('id', editingId)
        if (error) throw new Error('Unable to save teacher')
        if (hasLogin) {
          await callMembers('PATCH', {
            kind: 'teacher', id: editingId, fullName, permissions: access.permissions,
            ...(isOwner ? { isAdmin: access.isAdmin } : {}),
            ...(access.password ? { newPassword: access.password } : {}),
          })
        }
        toast.success('Teacher updated')
      }
      setOpen(false); setForm(emptyForm); setAccess(emptyAccess('teacher'))
      await loadTeachers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save teacher')
    }
    setSaving(false)
  }

  async function removeTeacher(id: string) {
    if (!window.confirm('Remove this teacher? Their login will stop working.')) return
    try { await callMembers('DELETE', undefined, `?kind=teacher&id=${id}`); toast.success('Teacher removed'); await loadTeachers() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to remove teacher') }
  }

  const atLimit = maxTeachers !== null && teachers.length >= maxTeachers

  if (checkingAccess) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" />Loading…</div>

  return <div className="flex flex-col gap-6">
    <PageHeader title="Teachers" description="Add teachers with their own login and choose what each one can do."><Button onClick={startCreate} disabled={atLimit}><Plus data-icon="inline-start" />Add teacher</Button></PageHeader>
    {maxTeachers !== null && <p className="text-sm text-muted-foreground">{teachers.length} of {maxTeachers} teacher seats used{atLimit && ' — upgrade your plan to add more'}</p>}
    {open && <Card><CardHeader><CardTitle>{editingId ? 'Edit teacher' : 'Add teacher'}</CardTitle><CardDescription>{editingId ? 'Update details, access or password.' : 'Set the login email and password the teacher will use.'}</CardDescription></CardHeader><CardContent>
      <form onSubmit={saveTeacher} className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="teacher-name">Full name</Label><Input id="teacher-name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="teacher-subject">Subject</Label><Input id="teacher-subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="teacher-phone">Phone</Label><Input id="teacher-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        {editingId && <div className="grid gap-2"><Label htmlFor="teacher-status">Status</Label><select id="teacher-status" className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>}
        {hasLogin
          ? <MemberAccessFields kind="teacher" value={access} onChange={setAccess} editing={Boolean(editingId)} canGrantAdmin={isOwner} />
          : <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">This teacher was added before logins existed, so they have no login yet. Remove and add them again to give them one.</p>}
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}{editingId ? 'Save changes' : 'Add teacher'}</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}><X data-icon="inline-start" />Cancel</Button></div>
      </form></CardContent></Card>}
    {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" />Loading teachers…</div> : teachers.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No teachers yet. Add your first teacher to get started.</CardContent></Card> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{teachers.map((t) => <Card key={t.id}><CardHeader className="flex-row items-center gap-3"><Avatar className="size-11"><AvatarFallback>{initials(t.full_name)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><CardTitle className="truncate text-base">{t.full_name}</CardTitle><CardDescription>{t.subject}</CardDescription></div><StatusBadge status={t.status} /></CardHeader><CardContent className="flex flex-col gap-3 text-sm text-muted-foreground"><span className="flex items-center gap-2"><BookOpen className="size-4" />{t.email}</span><span className="flex items-center gap-2 font-mono text-xs"><Phone className="size-4" />{t.phone ?? 'No phone added'}</span><div className="flex gap-2 pt-2"><Button size="sm" variant="outline" onClick={() => void startEdit(t)}><ShieldCheck data-icon="inline-start" /><Pencil data-icon="inline-start" />Edit &amp; access</Button><Button size="sm" variant="ghost" onClick={() => removeTeacher(t.id)}><Trash2 data-icon="inline-start" />Remove</Button></div></CardContent></Card>)}</div>}
  </div>
}
