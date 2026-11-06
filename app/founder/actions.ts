'use server'

import { revalidatePath } from 'next/cache'
import { requireFounderAdmin, writeFounderAudit } from '@/lib/founder-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { PLANS, normalizePlan } from '@/lib/plans'

// Every action here: checks the caller is a founder, does the change with the service-role client,
// and writes a line to the founder audit log. Nothing is reachable by ordinary users.

export type ActionResult = { ok: boolean; message: string }

const DAY = 86_400_000
const FAR_FUTURE = '2099-12-31T00:00:00.000Z'
const ORG_TYPES = ['solo_tutor', 'coaching_center']
const ROLES = ['owner', 'admin', 'teacher', 'student', 'parent']
const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value)

type Admin = ReturnType<typeof getAdminClient>

function must(error: { message: string } | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`)
}

async function run(
  action: string,
  orgId: string,
  metadata: Record<string, unknown>,
  work: (admin: Admin) => Promise<string>,
): Promise<ActionResult> {
  const founder = await requireFounderAdmin()
  if (!founder) return { ok: false, message: 'Not allowed.' }
  if (!isUuid(orgId)) return { ok: false, message: 'Invalid organisation.' }
  try {
    const message = await work(getAdminClient())
    await writeFounderAudit({ adminUserId: founder.id, adminEmail: founder.email, action, targetType: 'organization', targetId: orgId, metadata })
    revalidatePath('/founder')
    revalidatePath(`/founder/organizations/${orgId}`)
    return { ok: true, message }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Something went wrong.' }
  }
}

async function getSubscription(admin: Admin, orgId: string) {
  const { data } = await admin.from('subscriptions').select('*').eq('organization_id', orgId).maybeSingle()
  return data as { status?: string; trial_end?: string | null; current_period_end?: string | null } | null
}

// ---- Organisation details -------------------------------------------------------------

export async function updateOrganization(orgId: string, input: { name: string; type: string }) {
  const name = input.name.trim()
  if (name.length < 2) return { ok: false, message: 'Enter a name.' }
  if (!ORG_TYPES.includes(input.type)) return { ok: false, message: 'Invalid type.' }
  return run('update_organization', orgId, { name, type: input.type }, async (admin) => {
    const { error } = await admin.from('organizations').update({ name, type: input.type }).eq('id', orgId)
    must(error, 'Unable to save')
    return 'Organisation details saved.'
  })
}

// ---- Plan and permissions (seat limits) ---------------------------------------------

export async function setPlanAndLimits(orgId: string, input: { plan: string; maxStudents: number; maxTeachers: number }) {
  const plan = normalizePlan(input.plan)
  if (!plan) return { ok: false, message: 'Choose a plan.' }
  const maxStudents = Math.floor(Number(input.maxStudents))
  const maxTeachers = Math.floor(Number(input.maxTeachers))
  if (!(maxStudents >= 0 && maxStudents <= 1_000_000) || !(maxTeachers >= 0 && maxTeachers <= 100_000)) return { ok: false, message: 'Enter valid seat limits.' }
  return run('set_plan_and_limits', orgId, { plan, maxStudents, maxTeachers }, async (admin) => {
    const { error } = await admin.from('organizations').update({ plan, max_students: maxStudents, max_teachers: maxTeachers }).eq('id', orgId)
    must(error, 'Unable to save')
    await admin.from('subscriptions').update({ plan, updated_at: new Date().toISOString() }).eq('organization_id', orgId)
    return `Plan set to ${PLANS[plan].name} with ${maxStudents} students and ${maxTeachers} teachers.`
  })
}

// ---- Free access ------------------------------------------------------------------------

// Free days: pushes the end date forward from today (or from the current end if it is later).
export async function addFreeDays(orgId: string, days: number) {
  const count = Math.floor(Number(days))
  if (!(count >= 1 && count <= 3650)) return { ok: false, message: 'Enter between 1 and 3650 days.' }
  return run('add_free_days', orgId, { days: count }, async (admin) => {
    const sub = await getSubscription(admin, orgId)
    const now = Date.now()
    const ends = [sub?.trial_end, sub?.current_period_end].map((value) => (value ? new Date(value).getTime() : 0))
    const newEnd = new Date(Math.max(now, ...ends) + count * DAY).toISOString()
    const paying = sub?.status === 'active' || sub?.status === 'canceled'

    if (!sub) {
      const { error } = await admin.from('subscriptions').insert({ organization_id: orgId, plan: 'free', status: 'trialing', trial_end: newEnd })
      must(error, 'Unable to save')
    } else if (paying) {
      const { error } = await admin.from('subscriptions').update({ current_period_end: newEnd, updated_at: new Date().toISOString() }).eq('organization_id', orgId)
      must(error, 'Unable to save')
    } else {
      const { error } = await admin.from('subscriptions').update({ status: 'trialing', trial_end: newEnd, updated_at: new Date().toISOString() }).eq('organization_id', orgId)
      must(error, 'Unable to save')
    }
    return `Added ${count} free day${count === 1 ? '' : 's'}. Access now runs until ${newEnd.slice(0, 10)}.`
  })
}

// Free organisation: active until 2099 on the chosen plan, no payment ever asked.
export async function makeFree(orgId: string, planInput: string) {
  const plan = normalizePlan(planInput)
  if (!plan) return { ok: false, message: 'Choose a plan.' }
  return run('make_free', orgId, { plan }, async (admin) => {
    const now = new Date().toISOString()
    const { error: orgError } = await admin.from('organizations').update({ plan, max_students: PLANS[plan].maxStudents, max_teachers: PLANS[plan].maxTeachers }).eq('id', orgId)
    must(orgError, 'Unable to save')
    const { error } = await admin.from('subscriptions').upsert({
      organization_id: orgId, plan, status: 'active', cancel_at_period_end: false,
      current_period_start: now, current_period_end: FAR_FUTURE,
      stripe_subscription_id: 'founder:free', updated_at: now,
    }, { onConflict: 'organization_id' })
    must(error, 'Unable to save')
    return `Organisation is now free on the ${PLANS[plan].name} plan.`
  })
}

// Ends free access: payment is due again, with the normal 4-day grace before view-only mode.
export async function removeFree(orgId: string) {
  return run('remove_free', orgId, {}, async (admin) => {
    const now = new Date().toISOString()
    const { error } = await admin.from('subscriptions').update({ status: 'canceled', current_period_end: now, trial_end: now, stripe_subscription_id: null, updated_at: now }).eq('organization_id', orgId)
    must(error, 'Unable to save')
    return 'Free access removed. Payment is due; the 4-day grace period starts now.'
  })
}

// Puts the organisation straight into view-only mode (as if 4+ days overdue).
export async function suspendNow(orgId: string) {
  return run('suspend_now', orgId, {}, async (admin) => {
    const past = new Date(Date.now() - 5 * DAY).toISOString()
    const { error } = await admin.from('subscriptions').update({ status: 'canceled', trial_end: past, current_period_end: past, stripe_subscription_id: null, updated_at: new Date().toISOString() }).eq('organization_id', orgId)
    must(error, 'Unable to save')
    return 'Organisation is now suspended (view-only).'
  })
}

// ---- Members ------------------------------------------------------------------------------

async function ownProfile(admin: Admin, orgId: string, profileId: string) {
  if (!isUuid(profileId)) throw new Error('Invalid member.')
  const { data } = await admin.from('profiles').select('id, email, role, member_type').eq('id', profileId).eq('organization_id', orgId).maybeSingle()
  if (!data) throw new Error('Member not found in this organisation.')
  return data as { id: string; email: string | null; role: string; member_type?: string | null }
}

export async function resetMemberPassword(orgId: string, profileId: string, password: string) {
  if (password.length < 8) return { ok: false, message: 'The password must be at least 8 characters.' }
  return run('reset_member_password', orgId, { profileId }, async (admin) => {
    const profile = await ownProfile(admin, orgId, profileId)
    const { error } = await admin.auth.admin.updateUserById(profile.id, { password })
    must(error, 'Unable to change the password')
    return `Password changed for ${profile.email ?? 'this user'}.`
  })
}

export async function setMemberRole(orgId: string, profileId: string, role: string) {
  if (!ROLES.includes(role)) return { ok: false, message: 'Invalid role.' }
  return run('set_member_role', orgId, { profileId, role }, async (admin) => {
    const profile = await ownProfile(admin, orgId, profileId)
    const memberType = role === 'owner' ? 'owner' : role === 'teacher' ? 'teacher' : role === 'student' || role === 'parent' ? 'student' : profile.member_type ?? 'owner'
    let { error } = await admin.from('profiles').update({ role, member_type: memberType }).eq('id', profile.id)
    if (error) ({ error } = await admin.from('profiles').update({ role }).eq('id', profile.id)) // member_type column not created yet
    must(error, 'Unable to change the role')
    return `${profile.email ?? 'User'} is now ${role}.`
  })
}
