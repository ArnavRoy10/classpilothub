import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { PLANS, normalizePlan } from '@/lib/plans'

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get('x-razorpay-signature')
  if (!signature || !verifyRazorpaySignature(payload, signature)) return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })

  let event: {
    id?: string
    event?: string
    payload?: {
      subscription?: { entity?: { id?: string; notes?: { organization_id?: string; plan?: string }; status?: string; current_start?: number; current_end?: number } }
      payment_link?: { entity?: { id?: string; notes?: { student_fee_id?: string; organization_id?: string }; amount_paid?: number } }
      payment?: { entity?: { id?: string; status?: string; notes?: { student_fee_id?: string; organization_id?: string }; amount?: number } }
      qr_code?: { entity?: { id?: string; notes?: { kind?: string; organization_id?: string; plan?: string } } }
    }
  }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
  }
  const eventId = event.id
  if (!eventId || !event.event) return NextResponse.json({ error: 'Invalid webhook event.' }, { status: 400 })
  const adminClient = getAdminClient()
  const { error: claimError } = await adminClient.from('billing_webhook_events').insert({ stripe_event_id: `razorpay:${eventId}`, event_type: event.event })
  if (claimError) {
    if (claimError.code === '23505') return NextResponse.json({ received: true, duplicate: true })
    return NextResponse.json({ error: 'Unable to record webhook event.' }, { status: 500 })
  }

  const entity = event.payload?.subscription?.entity
  const organizationId = entity?.notes?.organization_id
  if (organizationId && entity?.id) {
    const plan = normalizePlan(entity.notes?.plan)
    const subscriptionId = `razorpay:${entity.id}`
    const razorpayStatus = String(entity.status ?? '')
    const periodStart = entity.current_start ? new Date(entity.current_start * 1000).toISOString() : null
    const periodEnd = entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null

    const { data: existing } = await adminClient.from('subscriptions').select('stripe_subscription_id').eq('organization_id', organizationId).maybeSingle()
    const isCurrent = !existing?.stripe_subscription_id || existing.stripe_subscription_id === subscriptionId

    if (razorpayStatus === 'active') {
      await adminClient.from('subscriptions').upsert({ organization_id: organizationId, stripe_subscription_id: subscriptionId, plan: plan ?? 'free', status: 'active', cancel_at_period_end: false, current_period_start: periodStart, current_period_end: periodEnd, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
      // Seat limits follow the plan only once it is actually paid and active.
      if (plan) await adminClient.from('organizations').update({ plan, max_students: PLANS[plan].maxStudents, max_teachers: PLANS[plan].maxTeachers }).eq('id', organizationId)
    } else if (isCurrent && ['cancelled', 'completed', 'expired'].includes(razorpayStatus)) {
      // Keep the paid-through date so access continues until the period actually ends.
      await adminClient.from('subscriptions').update({ status: 'canceled', ...(periodEnd ? { current_period_end: periodEnd } : {}), updated_at: new Date().toISOString() }).eq('organization_id', organizationId)
    } else if (isCurrent && ['halted', 'pending'].includes(razorpayStatus)) {
      await adminClient.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('organization_id', organizationId)
    }
    // 'created' / 'authenticated' are deliberately ignored: they must not overwrite a running
    // free trial or an already-paid plan.
  }

  // Payment Links: a parent finished paying via a fee payment link
  if (event.event === 'payment_link.paid') {
    const linkEntity = event.payload?.payment_link?.entity
    const studentFeeId = linkEntity?.notes?.student_fee_id
    if (studentFeeId) {
      await adminClient.from('student_fees').update({ status: 'paid' }).eq('id', studentFeeId)
      await adminClient.from('payments').insert({ student_fee_id: studentFeeId, amount: (linkEntity?.amount_paid ?? 0) / 100, method: 'razorpay_payment_link' })
    }
  }

  // QR codes: a parent scanned and paid a fee QR code (arrives as a captured payment)
  if (event.event === 'payment.captured') {
    const paymentEntity = event.payload?.payment?.entity
    const studentFeeId = paymentEntity?.notes?.student_fee_id
    if (studentFeeId) {
      await adminClient.from('student_fees').update({ status: 'paid' }).eq('id', studentFeeId)
      await adminClient.from('payments').insert({ student_fee_id: studentFeeId, amount: (paymentEntity?.amount ?? 0) / 100, method: 'razorpay_qr_code' })
    }
  }

  // Plan payment by QR: the owner paid one month of a plan by scanning a QR code.
  // There is no autopay behind this, so the plan runs for 30 days and then asks for renewal.
  if (event.event === 'qr_code.credited') {
    const qr = event.payload?.qr_code?.entity
    const payment = event.payload?.payment?.entity
    const notes = qr?.notes
    const qrPlan = normalizePlan(notes?.plan)
    if (notes?.kind === 'plan_qr' && notes.organization_id && qr?.id && qrPlan && payment?.status === 'captured' && payment.amount === PLANS[qrPlan].monthly * 100) {
      const orgId = notes.organization_id
      const { data: current } = await adminClient.from('subscriptions').select('status, current_period_end').eq('organization_id', orgId).maybeSingle()
      const now = Date.now()
      const currentEnd = current?.current_period_end ? new Date(current.current_period_end).getTime() : 0
      // Paid early: the new month starts when the paid time runs out, so nothing is lost.
      const startMs = ['active', 'canceled'].includes(current?.status ?? '') && currentEnd > now ? currentEnd : now
      const endMs = startMs + 30 * 86_400_000
      await adminClient.from('subscriptions').upsert({
        organization_id: orgId,
        stripe_subscription_id: `qr:${qr.id}`,
        plan: qrPlan,
        status: 'active',
        cancel_at_period_end: true, // no autopay: the UI shows "will not renew, renew before it ends"
        current_period_start: new Date(startMs).toISOString(),
        current_period_end: new Date(endMs).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' })
      await adminClient.from('organizations').update({ plan: qrPlan, max_students: PLANS[qrPlan].maxStudents, max_teachers: PLANS[qrPlan].maxTeachers }).eq('id', orgId)
    }
  }

  return NextResponse.json({ received: true })
}
