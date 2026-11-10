import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { memberTypeOf, resolvePermissions, type MemberType, type Permissions } from '@/lib/permissions'

export type UserContext = {
  userId: string
  fullName: string
  email: string
  role: string
  memberType: MemberType | null
  permissions: Permissions
  organization: {
    id: string
    name: string
    type: string
    plan: string
    maxTeachers: number
    maxStudents: number
  }
}

// cache(): the layout, the section guard and the page all ask for this, but it only runs once per request.
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createClient()

  // getClaims() checks the signed login token locally instead of calling the Supabase auth server.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) return null
  const userId = claims.sub
  const authEmail = typeof (claims as { email?: unknown }).email === 'string' ? (claims as { email: string }).email : ''

  const orgFields = 'organizations(id, name, type, plan, max_teachers, max_students)'
  type ProfileRow = {
    id: string; full_name: string; email: string | null; role: string; organization_id: string
    member_type?: string | null; permissions?: unknown; organizations: unknown
  }
  let { data: profile } = (await supabase
    .from('profiles')
    .select(`id, full_name, email, role, member_type, permissions, organization_id, ${orgFields}`)
    .eq('id', userId)
    .maybeSingle()) as { data: ProfileRow | null }

  // Before docs/member-access.sql has been run the two new columns do not exist yet.
  if (!profile) {
    const fallback = await supabase
      .from('profiles')
      .select(`id, full_name, email, role, organization_id, ${orgFields}`)
      .eq('id', userId)
      .maybeSingle()
    profile = fallback.data as ProfileRow | null
  }

  type OrgRow = { id: string; name: string; type: string; plan: string; max_teachers: number; max_students: number }
  const rawOrganization = profile?.organizations
  const organization = (Array.isArray(rawOrganization) ? rawOrganization[0] : rawOrganization) as OrgRow | undefined

  if (!profile || !organization) return null

  return {
    userId,
    fullName: profile.full_name,
    email: profile.email || authEmail,
    role: profile.role,
    memberType: memberTypeOf(profile),
    permissions: resolvePermissions(memberTypeOf(profile), profile.permissions),
    organization: {
      id: organization.id,
      name: organization.name,
      type: organization.type,
      plan: organization.plan,
      maxTeachers: organization.max_teachers,
      maxStudents: organization.max_students,
    },
  }
})
