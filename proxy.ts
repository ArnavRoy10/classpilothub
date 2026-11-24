import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { SITE_URL } from '@/lib/site-url'

// Only the permanent production alias is redirected. Preview deployments
// (class-pilot-xxxx.vercel.app) are left alone so you can still test them.
const DUPLICATE_HOSTS = new Set(['classpilothub.vercel.app'])

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').toLowerCase()

  if (DUPLICATE_HOSTS.has(host)) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, SITE_URL)
    return NextResponse.redirect(target, 308)
  }

  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
