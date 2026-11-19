import { NextResponse } from 'next/server'
import { getUserContext } from '@/lib/supabase/user-context'
import { getOrganizationBillingState } from '@/lib/billing-gate'

export async function GET() {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const state = await getOrganizationBillingState(context.organization.id, context.organization.plan)
  return NextResponse.json({ kind: state.kind, periodEnd: state.periodEnd }, { headers: { 'Cache-Control': 'no-store' } })
}
