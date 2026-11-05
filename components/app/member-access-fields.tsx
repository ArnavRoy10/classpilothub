'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STAFF_SECTIONS, STUDENT_ACTIONS, STUDENT_SECTIONS, defaultPermissions, type Permissions } from '@/lib/permissions'

export type AccessState = { email: string; password: string; isAdmin: boolean; permissions: Permissions }

export function emptyAccess(kind: 'teacher' | 'student'): AccessState {
  return { email: '', password: '', isAdmin: false, permissions: defaultPermissions(kind) }
}

function Check({ checked, disabled, onChange, label, hint }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  return (
    <label className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50'}`}>
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span><span className="block font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    </label>
  )
}

// Login details + what this person may see / change. Used when adding or editing a teacher or student.
export function MemberAccessFields({ kind, value, onChange, editing, canGrantAdmin }: {
  kind: 'teacher' | 'student'
  value: AccessState
  onChange: (next: AccessState) => void
  editing: boolean
  canGrantAdmin: boolean
}) {
  const sections = kind === 'teacher' ? STAFF_SECTIONS : STUDENT_SECTIONS
  const actions = kind === 'student' ? STUDENT_ACTIONS : []
  const setPermission = (key: string, checked: boolean) => onChange({ ...value, permissions: { ...value.permissions, [key]: checked } })

  return (
    <div className="grid gap-4 sm:col-span-2">
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Login details</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {kind === 'teacher' ? 'The teacher' : 'The student'} logs in with this email and password using the {kind === 'teacher' ? 'Teacher' : 'Student'} option on the login page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="member-login-email">Login email</Label>
            <Input id="member-login-email" type="email" autoComplete="off" required={!editing} readOnly={editing} value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-login-password">{editing ? 'New password (leave blank to keep)' : 'Password'}</Label>
            <Input id="member-login-password" type="text" autoComplete="new-password" minLength={8} required={!editing} placeholder="At least 8 characters" value={value.password} onChange={(e) => onChange({ ...value, password: e.target.value })} />
          </div>
        </div>
      </div>

      {canGrantAdmin && (
        <Check
          checked={value.isAdmin}
          onChange={(isAdmin) => onChange({ ...value, isAdmin })}
          label="Give admin powers"
          hint="Full access to every section and the right to add or remove teachers and students. Billing stays with the owner."
        />
      )}

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">{kind === 'teacher' ? 'What this teacher can open' : 'What this student can see and change'}</h3>
        {value.isAdmin && <p className="mb-3 text-xs text-muted-foreground">Admins can open everything, so these choices are ignored while admin powers are on.</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <Check key={section.key} checked={value.isAdmin || value.permissions[section.key] === true} disabled={value.isAdmin} onChange={(checked) => setPermission(section.key, checked)} label={section.label} hint={section.description} />
          ))}
          {actions.map((action) => (
            <Check key={action.key} checked={value.permissions[action.key] === true} disabled={value.isAdmin} onChange={(checked) => setPermission(action.key, checked)} label={action.label} hint={action.description} />
          ))}
        </div>
      </div>
    </div>
  )
}
