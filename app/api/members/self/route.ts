import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/supabase/user-context'
import { getAdminClient } from '@/lib/supabase/admin'

// A student changes their own details, but only if the owner switched "Edit own profile" on.
export async function PATCH(request: Request) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  if (context.memberType !== 'student' || context.permissions.edit_profile !== true) {
    return NextResponse.json({ error: 'Your owner has not allowed you to edit your profile.' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as { fullName?: string; guardianPhone?: string } | null
  const fullName = String(body?.fullName ?? '').trim()
  const guardianPhone = String(body?.guardianPhone ?? '').trim()
  if (fullName.length < 2) return NextResponse.json({ error: 'Enter your name.' }, { status: 400 })

  const admin = getAdminClient()
  const { data: profile } = await admin.from('profiles').select('student_id').eq('id', context.userId).maybeSingle()
  await admin.from('profiles').update({ full_name: fullName }).eq('id', context.userId)
  if (profile?.student_id) {
    await admin.from('students').update({ full_name: fullName, guardian_phone: guardianPhone || null }).eq('id', profile.student_id).eq('organization_id', context.organization.id)
  }
  return NextResponse.json({ ok: true })
}
