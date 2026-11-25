import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { memberTypeOf } from '@/lib/permissions'

// Only allow paths on this site. "//evil.com" starts with "/" too, so it is rejected explicitly.
function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : null
}

type ProfileRow = { role?: string; member_type?: string | null }

function founderEmails() {
  return (process.env.FOUNDER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeNext(url.searchParams.get('next'))
  const mode = url.searchParams.get('mode') // 'login' | 'signup' for Google, absent for email links
  const expected = url.searchParams.get('as') // member type chosen on the login page

  // Email confirmation links: same behaviour as before.
  if (mode !== 'login' && mode !== 'signup') {
    if (code) {
      const supabase = await createClient()
      await supabase.auth.exchangeCodeForSession(code)
    }
    return NextResponse.redirect(new URL(next ?? '/dashboard', url.origin))
  }

  // ---- Google sign-in ----
  const page = mode === 'signup' ? '/signup' : '/login'
  const fail = (reason: string, extra?: Record<string, string>) => {
    const target = new URL(page, url.origin)
    target.searchParams.set('error', reason)
    for (const [key, value] of Object.entries(extra ?? {})) target.searchParams.set(key, value)
    return NextResponse.redirect(target)
  }

  if (url.searchParams.get('error') || !code) return fail('google_failed')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return fail('google_failed')
  const user = data.user

  // member_type only exists after docs/member-access.sql has been run, so fall back to role alone.
  let profile: ProfileRow | null = null
  const withType = await supabase.from('profiles').select('role, member_type').eq('id', user.id).maybeSingle()
  if (withType.error) {
    const fallback = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    profile = fallback.data as unknown as ProfileRow | null
  } else {
    profile = withType.data as unknown as ProfileRow | null
  }
  const actual = memberTypeOf(profile)

  // Best-effort login record, same table the email login writes to.
  const recordLogin = async () => {
    try {
      const admin = getAdminClient()
      const { data: row } = await admin.from('profiles').select('organization_id').eq('id', user.id).maybeSingle()
      await admin.from('login_events').insert({
        user_id: user.id,
        organization_id: row?.organization_id ?? null,
        email: user.email,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? null,
        user_agent: request.headers.get('user-agent'),
      })
    } catch (logError) {
      console.error('[google-login] could not record login:', logError)
    }
  }

  // No workspace profile yet.
  if (!actual) {
    // Founder: only when Google says the email is verified.
    const isFounder =
      mode === 'login' &&
      (!expected || expected === 'owner') &&
      Boolean(user.email_confirmed_at) &&
      founderEmails().includes((user.email ?? '').toLowerCase())
    if (isFounder) {
      await recordLogin()
      return NextResponse.redirect(new URL('/founder', url.origin))
    }

    // New owner: finish setup on the onboarding page (it asks for the center name and plan).
    if (mode === 'signup') return NextResponse.redirect(new URL('/onboarding', url.origin))

    // Log in with no account: same outcome as the email form, sign out and explain.
    await supabase.auth.signOut()
    return fail('no_account')
  }

  // The account must belong to the tab that was chosen on the login page.
  if (mode === 'login' && expected && actual !== expected) {
    await supabase.auth.signOut()
    return fail('wrong_type', { type: actual })
  }

  await recordLogin()
  const isPortalUser = profile?.role === 'student' || profile?.role === 'parent'
  const destination = isPortalUser ? (next?.startsWith('/portal') ? next : '/portal') : (next ?? '/dashboard')
  return NextResponse.redirect(new URL(destination, url.origin))
}
