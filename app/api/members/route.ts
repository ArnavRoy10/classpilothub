import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { organizationSuspendedResponse } from '@/lib/billing-gate'
import { cleanPermissions, type MemberType } from '@/lib/permissions'
import { linkStudentToBatch, resolveBatch, type ResolvedBatch } from '@/lib/batch-assign'

// Owner / admin only: create, inspect, update and remove teacher and student logins.
// Everything here runs on the server with the service-role client, after checking who is asking.

type Kind = 'teacher' | 'student'
const isKind = (value: unknown): value is Kind => value === 'teacher' || value === 'student'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

async function getCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: fail('Not signed in.', 401) }
  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).maybeSingle()
  if (!profile?.organization_id || !['owner', 'admin'].includes(profile.role)) {
    return { response: fail('Only the owner or an admin can manage members.', 403) }
  }
  return { user, organizationId: profile.organization_id as string, isOwner: profile.role === 'owner' }
}

// Finds the teacher/student record in the caller's organisation and the login that belongs to it.
async function findMember(kind: Kind, id: string, organizationId: string) {
  const admin = getAdminClient()
  if (kind === 'student') {
    const { data: record } = await admin.from('students').select('id, full_name').eq('id', id).eq('organization_id', organizationId).maybeSingle()
    if (!record) return null
    const { data: profile } = await admin.from('profiles').select('id, role, email, permissions').eq('student_id', id).eq('organization_id', organizationId).maybeSingle()
    return { record, profile }
  }
  const { data: record } = await admin.from('teachers').select('id, full_name, email').eq('id', id).eq('organization_id', organizationId).maybeSingle()
  if (!record) return null
  const { data: profile } = await admin.from('profiles').select('id, role, email, permissions').eq('email', record.email).eq('organization_id', organizationId).maybeSingle()
  return { record, profile }
}

const memberRole = (kind: Kind, isAdmin: boolean) => (isAdmin ? 'admin' : kind)

// GET /api/members?kind=teacher&id=...  -> current login settings for the edit form
export async function GET(request: Request) {
  const caller = await getCaller()
  if ('response' in caller) return caller.response
  const url = new URL(request.url)
  const kind = url.searchParams.get('kind')
  const id = url.searchParams.get('id')
  if (!isKind(kind) || !id) return fail('Invalid request.', 400)
  const member = await findMember(kind, id, caller.organizationId)
  if (!member) return fail('Member not found.', 404)
  if (!member.profile) return NextResponse.json({ hasLogin: false, isAdmin: false, permissions: cleanPermissions(kind, {}) })
  return NextResponse.json({
    hasLogin: true,
    email: member.profile.email,
    isAdmin: member.profile.role === 'admin',
    permissions: cleanPermissions(kind, member.profile.permissions),
  })
}

// POST -> create the login (email + password) together with the teacher / student record
export async function POST(request: Request) {
  const caller = await getCaller()
  if ('response' in caller) return caller.response
  const suspended = await organizationSuspendedResponse()
  if (suspended) return suspended

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || !isKind(body.kind)) return fail('Invalid request.', 400)
  const kind = body.kind
  const fullName = String(body.fullName ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const isAdmin = body.isAdmin === true
  if (fullName.length < 2) return fail('Enter the full name.', 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.', 400)
  if (password.length < 8) return fail('The password must be at least 8 characters.', 400)
  if (isAdmin && !caller.isOwner) return fail('Only the owner can give admin powers.', 403)

  const subject = String(body.subject ?? '').trim()
  const studentCode = String(body.studentCode ?? '').trim().toUpperCase()
  if (kind === 'teacher' && subject.length < 2) return fail('Enter the subject.', 400)
  if (kind === 'student' && studentCode.length < 2) return fail('Enter the student code.', 400)

  const admin = getAdminClient()

  // Seat limit of the plan
  const { data: org } = await admin.from('organizations').select('max_teachers, max_students').eq('id', caller.organizationId).maybeSingle()
  const limit = kind === 'teacher' ? org?.max_teachers : org?.max_students
  const { count } = await admin.from(kind === 'teacher' ? 'teachers' : 'students').select('id', { count: 'exact', head: true }).eq('organization_id', caller.organizationId)
  if (typeof limit === 'number' && (count ?? 0) >= limit) return fail(`Your plan's ${kind} seat limit has been reached. Upgrade your plan to add more.`, 403)

  // The batch a student joins: an existing one, or a new one typed in the form (created here).
  let batch: ResolvedBatch | null = null
  if (kind === 'student') {
    try {
      batch = await resolveBatch(admin, caller.organizationId, { batchId: String(body.batchId ?? ''), newBatchName: String(body.newBatchName ?? '') })
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Could not use that batch.', 400)
    }
  }

  // 1. the login
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createError || !created.user) {
    const exists = createError?.message?.toLowerCase().includes('already')
    return fail(exists ? 'An account with that email already exists.' : 'Unable to create the login.', exists ? 409 : 400)
  }
  const userId = created.user.id
  const rollback = async (recordTable?: string, recordId?: string) => {
    if (recordTable && recordId) await admin.from(recordTable).delete().eq('id', recordId)
    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }

  // 2. the teacher / student record
  const recordTable = kind === 'teacher' ? 'teachers' : 'students'
  const recordPayload: Record<string, unknown> = kind === 'teacher'
    ? { organization_id: caller.organizationId, full_name: fullName, email, phone: String(body.phone ?? '').trim() || null, subject, status: 'active' }
    : {
        organization_id: caller.organizationId, full_name: fullName, student_code: studentCode,
        batch: batch?.name ?? null,
        guardian_name: String(body.guardianName ?? '').trim() || null,
        guardian_phone: String(body.guardianPhone ?? '').trim() || null,
      }
  const { data: record, error: recordError } = await admin.from(recordTable).insert(recordPayload).select('id').single()
  if (recordError || !record) {
    await rollback()
    const message = recordError?.message?.includes('seat limit') ? recordError.message : recordError?.code === '23505' ? (kind === 'teacher' ? 'A teacher with that email already exists.' : 'That student code already exists.') : `Unable to save the ${kind}.`
    return fail(message, 400)
  }

  // 3. the profile that decides role, login option and permissions
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    organization_id: caller.organizationId,
    full_name: fullName,
    email,
    role: memberRole(kind, isAdmin),
    member_type: kind as MemberType,
    permissions: cleanPermissions(kind, body.permissions),
    ...(kind === 'student' ? { student_id: record.id } : {}),
  }, { onConflict: 'id' })
  if (profileError) {
    await rollback(recordTable, record.id)
    return fail('Unable to set up the account. Have you run docs/member-access.sql in Supabase?', 500)
  }

  // 4. put the student in the batch so they show up on the Batches page
  const warning = kind === 'student' && batch ? await linkStudentToBatch(admin, record.id, batch) : null

  return NextResponse.json({ id: record.id, userId, batch: batch?.name ?? null, createdBatch: batch?.created ?? false, warning })
}

// PATCH -> change admin powers, permissions, name or password of an existing login
export async function PATCH(request: Request) {
  const caller = await getCaller()
  if ('response' in caller) return caller.response
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || !isKind(body.kind) || typeof body.id !== 'string') return fail('Invalid request.', 400)
  const kind = body.kind

  const member = await findMember(kind, body.id, caller.organizationId)
  if (!member) return fail('Member not found.', 404)
  if (!member.profile) return fail('This person has no login yet.', 404)
  if (member.profile.role === 'owner') return fail('The owner account cannot be changed here.', 403)
  if (member.profile.id === caller.user.id && body.isAdmin === false) return fail('You cannot remove your own admin powers.', 400)

  const admin = getAdminClient()
  const update: Record<string, unknown> = {}
  if (typeof body.isAdmin === 'boolean') {
    if (!caller.isOwner) return fail('Only the owner can change admin powers.', 403)
    update.role = memberRole(kind, body.isAdmin)
  }
  if (body.permissions !== undefined) update.permissions = cleanPermissions(kind, body.permissions)
  if (typeof body.fullName === 'string' && body.fullName.trim().length >= 2) update.full_name = body.fullName.trim()
  if (Object.keys(update).length) {
    const { error } = await admin.from('profiles').update(update).eq('id', member.profile.id)
    if (error) return fail('Unable to update access.', 500)
  }

  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (newPassword) {
    if (newPassword.length < 8) return fail('The password must be at least 8 characters.', 400)
    const { error } = await admin.auth.admin.updateUserById(member.profile.id, { password: newPassword })
    if (error) return fail('Unable to change the password.', 500)
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/members?kind=teacher&id=... -> remove the record and the login
export async function DELETE(request: Request) {
  const caller = await getCaller()
  if ('response' in caller) return caller.response
  const url = new URL(request.url)
  const kind = url.searchParams.get('kind')
  const id = url.searchParams.get('id')
  if (!isKind(kind) || !id) return fail('Invalid request.', 400)

  const member = await findMember(kind, id, caller.organizationId)
  if (!member) return fail('Member not found.', 404)
  if (member.profile?.role === 'owner' || member.profile?.id === caller.user.id) return fail('This account cannot be removed.', 403)
  if (member.profile?.role === 'admin' && !caller.isOwner) return fail('Only the owner can remove an admin.', 403)

  const admin = getAdminClient()
  const { error } = await admin.from(kind === 'teacher' ? 'teachers' : 'students').delete().eq('id', id).eq('organization_id', caller.organizationId)
  if (error) return fail('Unable to remove this record. It may still have attendance, fees or results linked to it.', 409)
  if (member.profile) {
    await admin.from('profiles').delete().eq('id', member.profile.id)
    await admin.auth.admin.deleteUser(member.profile.id)
  }
  return NextResponse.json({ ok: true })
}
