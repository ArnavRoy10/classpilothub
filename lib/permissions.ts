// Roles and permissions for organisation members.
//
// profiles.role        : 'owner' | 'admin' | 'teacher' | 'student' | 'parent'  (existing column)
// profiles.member_type : 'owner' | 'teacher' | 'student'  -> which login option the person uses
// profiles.permissions : jsonb of booleans chosen by the owner
//
// A teacher or student that the owner gives admin powers keeps their member_type
// (they still log in through the Teacher / Student option) but their role becomes 'admin',
// which unlocks everything an admin can do (all sections, adding/removing members).

export type MemberType = 'owner' | 'teacher' | 'student'
export type Permissions = Record<string, boolean>

export const MEMBER_TYPES: MemberType[] = ['owner', 'teacher', 'student']

export type SectionDef = { key: string; label: string; href: string; description: string }

// Sections of the staff dashboard (/dashboard ...) a teacher can be given.
export const STAFF_SECTIONS: SectionDef[] = [
  { key: 'students', label: 'Students', href: '/students', description: 'View and manage student records' },
  { key: 'teachers', label: 'Teachers', href: '/teachers', description: 'View and manage teachers' },
  { key: 'batches', label: 'Batches', href: '/batches', description: 'Class groups and timings' },
  { key: 'attendance', label: 'Attendance', href: '/attendance', description: 'Mark and view attendance' },
  { key: 'tests', label: 'Tests', href: '/tests', description: 'Create and manage tests' },
  { key: 'results', label: 'Results', href: '/results', description: 'Enter and view results' },
  { key: 'timetable', label: 'Timetable', href: '/timetable', description: 'Weekly class schedule' },
  { key: 'fees', label: 'Fees', href: '/fees', description: 'Fee records and payments' },
  { key: 'announcements', label: 'Announcements', href: '/announcements', description: 'Post notices' },
  { key: 'communications', label: 'Communications', href: '/communications', description: 'Send messages' },
  { key: 'reports', label: 'Reports', href: '/reports', description: 'Financial and academic reports' },
]

// Pages of the student portal (/portal ...) a student can be given.
export const STUDENT_SECTIONS: SectionDef[] = [
  { key: 'attendance', label: 'Attendance', href: '/portal/attendance', description: 'See own attendance' },
  { key: 'results', label: 'Results', href: '/portal/results', description: 'See own test results' },
  { key: 'timetable', label: 'Timetable', href: '/portal/timetable', description: 'See class timetable' },
  { key: 'announcements', label: 'Announcements', href: '/portal/announcements', description: 'Read announcements' },
  { key: 'fees', label: 'Fees', href: '/portal/fees', description: 'See fee status and dues' },
]

// Things a student can change themselves.
export const STUDENT_ACTIONS: SectionDef[] = [
  { key: 'edit_profile', label: 'Edit own profile', href: '', description: 'Change own name and guardian phone' },
]

export const DEFAULT_TEACHER_PERMISSIONS: Permissions = {
  students: true, teachers: false, batches: true, attendance: true, tests: true, results: true,
  timetable: true, fees: false, announcements: true, communications: false, reports: false,
}

export const DEFAULT_STUDENT_PERMISSIONS: Permissions = {
  attendance: true, results: true, timetable: true, announcements: true, fees: true, edit_profile: false,
}

export function defaultPermissions(type: MemberType): Permissions {
  if (type === 'teacher') return { ...DEFAULT_TEACHER_PERMISSIONS }
  if (type === 'student') return { ...DEFAULT_STUDENT_PERMISSIONS }
  return {}
}

export function isAdminRole(role?: string | null) {
  return role === 'owner' || role === 'admin'
}

export function memberTypeOf(profile: { role?: string | null; member_type?: string | null } | null | undefined): MemberType | null {
  if (!profile) return null
  if (profile.member_type && (MEMBER_TYPES as string[]).includes(profile.member_type)) return profile.member_type as MemberType
  if (profile.role === 'owner' || profile.role === 'admin') return 'owner'
  if (profile.role === 'teacher') return 'teacher'
  if (profile.role === 'student' || profile.role === 'parent') return 'student'
  return null
}

// Only keeps keys that exist for that member type, as real booleans.
export function cleanPermissions(type: MemberType, input: unknown): Permissions {
  const allowed = type === 'teacher'
    ? STAFF_SECTIONS.map((s) => s.key)
    : type === 'student'
      ? [...STUDENT_SECTIONS, ...STUDENT_ACTIONS].map((s) => s.key)
      : []
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const base = defaultPermissions(type)
  for (const key of allowed) if (key in source) base[key] = source[key] === true
  return base
}

export function resolvePermissions(type: MemberType | null, stored: unknown): Permissions {
  if (!type) return {}
  return cleanPermissions(type, stored)
}

// Owners and admins can do everything; everyone else needs the flag.
export function hasPermission(ctx: { role: string; permissions: Permissions }, key: string) {
  if (isAdminRole(ctx.role)) return true
  return ctx.permissions[key] === true
}
