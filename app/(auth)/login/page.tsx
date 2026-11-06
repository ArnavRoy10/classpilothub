'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { toast } from 'sonner'
import { Briefcase, GraduationCap, UserRound, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'
import { memberTypeOf, type MemberType } from '@/lib/permissions'

const options: { id: MemberType; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap, hint: 'See your attendance, results, timetable and announcements.' },
  { id: 'teacher', label: 'Teacher', icon: UserRound, hint: 'Take attendance, manage tests and results for your classes.' },
  { id: 'owner', label: 'Owner', icon: Briefcase, hint: 'Manage your center, members, fees and billing.' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<MemberType>('student')
  const current = options.find((option) => option.id === selected)!

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const supabase = createClient()
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      setLoading(false)
      toast.error(error?.status === 429 ? 'Too many attempts. Please try again later.' : 'Invalid email or password.')
      return
    }

    // The account must belong to the option that was chosen.
    let { data: profile } = await supabase.from('profiles').select('role, member_type').eq('id', data.user.id).maybeSingle() as { data: { role?: string; member_type?: string | null } | null }
    if (!profile) {
      // member_type does not exist until docs/member-access.sql has been run.
      const fallback = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      profile = fallback.data
    }
    const actual = memberTypeOf(profile)
    if (!actual && selected === 'owner') {
      // The founder may have no organisation profile: send them to the founder console.
      const isFounder = await fetch('/api/auth/is-founder').then((response) => response.json()).then((result: { founder?: boolean }) => result.founder === true).catch(() => false)
      if (isFounder) { toast.success('Welcome back, founder'); router.push('/founder'); router.refresh(); return }
    }
    if (!actual) {
      await supabase.auth.signOut()
      setLoading(false)
      toast.error('This account is not set up yet. Please contact your center owner.')
      return
    }
    if (actual !== selected) {
      await supabase.auth.signOut()
      setLoading(false)
      toast.error(`This is a ${actual} account. Please choose "${options.find((option) => option.id === actual)!.label}" above to log in.`)
      return
    }

    toast.success('Welcome back to ClassPilot')
    const accessToken = data.session?.access_token
    if (accessToken) {
      void fetch('/api/auth/log-session', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
    }

    const next = searchParams.get('next')
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null
    const isPortalUser = profile?.role === 'student' || profile?.role === 'parent'
    router.push(isPortalUser ? (safeNext?.startsWith('/portal') ? safeNext : '/portal') : (safeNext ?? '/dashboard'))
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Choose how you want to log in to ClassPilot.</p>
      </div>

      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Log in as">
        {options.map((option) => {
          const Icon = option.icon
          const active = option.id === selected
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(option.id)}
              className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
            >
              <Icon className="size-5" />
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">{current.hint}</p>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></Field>
          <Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required /></Field>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in…' : `Log in as ${current.label}`}</Button>
        </FieldGroup>
      </form>

      {selected === 'owner' ? (
        <p className="text-center text-sm text-muted-foreground">New to ClassPilot? <Link href="/signup" className="font-medium text-primary hover:underline">Create an owner account</Link></p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Your email and password are given to you by your center owner. Forgot them? Ask your owner to reset your password.</p>
      )}
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}
