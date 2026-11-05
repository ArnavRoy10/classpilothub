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

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const orgFields = 'organizations(id, name, type, plan, max_teachers, max_students)'
  type ProfileRow = {
    id: string; full_name: string; email: string | null; role: string; organization_id: string
    member_type?: string | null; permissions?: unknown; organizations: unknown
  }
  let { data: profile } = (await supabase
    .from('profiles')
    .select(`id, full_name, email, role, member_type, permissions, organization_id, ${orgFields}`)
    .eq('id', user.id)
    .maybeSingle()) as { data: ProfileRow | null }

  // Before docs/member-access.sql has been run the two new columns do not exist yet.
  if (!profile) {
    const fallback = await supabase
      .from('profiles')
      .select(`id, full_name, email, role, organization_id, ${orgFields}`)
      .eq('id', user.id)
      .maybeSingle()
    profile = fallback.data as ProfileRow | null
  }

  type OrgRow = { id: string; name: string; type: string; plan: string; max_teachers: number; max_students: number }
  const rawOrganization = profile?.organizations
  const organization = (Array.isArray(rawOrganization) ? rawOrganization[0] : rawOrganization) as OrgRow | undefined

  if (!profile || !organization) return null

  return {
    userId: user.id,
    fullName: profile.full_name,
    email: profile.email || user.email || '',
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
}
