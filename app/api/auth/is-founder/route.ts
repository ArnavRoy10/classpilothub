import { NextResponse } from 'next/server'
import { requireFounderAdmin } from '@/lib/founder-admin'

// Lets the login page know the signed-in person is a founder (so it can open /founder).
export async function GET() {
  const founder = await requireFounderAdmin()
  return NextResponse.json({ founder: Boolean(founder) })
}
