import 'server-only'

import { cache } from 'react'
import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { getUserContext } from '@/lib/supabase/user-context'
import { TRIAL_DAYS, computeBillingState, type BillingState } from '@/lib/billing-state'

const DAY_MS = 86_400_000

export const getOrganizationBillingState = cache(async (organizationId: string, organizationPlan?: string | null): Promise<BillingState> => {
  // Admin client on purpose: teachers, students and parents may not be able to read the
  // subscriptions table under RLS, but they must still be locked out when the bill is unpaid.
  // organizationId always comes from the signed-in user's own profile (getUserContext).
  const admin = getAdminClient()
  const { data: found } = await admin.from('subscriptions').select('*').eq('organization_id', organizationId).maybeSingle()
  let subscription = found

  // Self-heal: an organisation with no dates on record would never leave its trial.
  // Start the 14 days from when the organisation (or its subscription row) was created.
  if (!subscription || (!subscription.trial_end && !subscription.current_period_end)) {
    const { data: org } = await admin.from('organizations').select('*').eq('id', organizationId).maybeSingle()
    const createdAt = new Date(subscription?.created_at ?? org?.created_at ?? Date.now())
    const startedAt = Number.isNaN(createdAt.getTime()) ? Date.now() : createdAt.getTime()
    const trialEnd = new Date(startedAt + TRIAL_DAYS * DAY_MS).toISOString()

    const { error } = subscription
      ? await admin.from('subscriptions').update({ trial_end: trialEnd }).eq('organization_id', organizationId)
      : await admin.from('subscriptions').insert({ organization_id: organizationId, plan: 'free', status: 'trialing', trial_end: trialEnd })
    if (error) console.error('Unable to start trial period:', error.code, error.message)
    subscription = { ...(subscription ?? { status: 'trialing', plan: 'free' }), trial_end: trialEnd }
  }

  return computeBillingState(subscription, organizationPlan)
})

// For API routes: returns a 402 response when the organisation is suspended for non-payment, otherwise null.
export async function organizationSuspendedResponse() {
  const context = await getUserContext()
  if (!context) return null
  const state = await getOrganizationBillingState(context.organization.id, context.organization.plan)
  if (state.kind !== 'suspended') return null
  return NextResponse.json({ error: 'Your organisation is suspended because of an unpaid bill. The owner can pay from the billing page to reactivate it.' }, { status: 402 })
}
