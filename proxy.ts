import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  if (request.headers.get('host') === 'classpilothub.vercel.app') {
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://www.classpilothub.me'),
      308,
    )
  }
  return updateSession(request)
}
