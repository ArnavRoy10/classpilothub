import { NextResponse } from 'next/server'
import { getBillingContext } from '@/lib/billing'
import { createPlanQrCode, razorpay } from '@/lib/razorpay'
import { computeBillingState } from '@/lib/billing-state'
import { PLANS, normalizePlan } from '@/lib/plans'

// Creates a one-time UPI QR for one month of a plan. The money is credited via the
// `qr_code.credited` webhook (see app/api/razorpay/webhook/route.ts), which activates the plan.
export async function POST(request: Request) {
  try {
    if (!razorpay) return NextResponse.json({ error: 'Razorpay is not configured.' }, { status: 503 })

    const body = (await request.json().catch(() => null)) as { plan?: string } | null
    const planId = normalizePlan(body?.plan)
    if (!planId) return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })

    const context = await getBillingContext()
    if (!context) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    if (context.profile.role !== 'owner') return NextResponse.json({ error: 'Only organization owners can manage billing.' }, { status: 403 })

    const state = computeBillingState(context.subscription, context.organization.plan)
    const plan = PLANS[planId]

    if (state.kind === 'trial' || state.kind === 'unknown') {
      return NextResponse.json({ error: 'You are on a free trial. Payment starts when the trial ends.' }, { status: 400 })
    }
    if (state.mustPay && planId !== state.planId) {
      return NextResponse.json({ error: `Clear your pending ${state.planName} bill (₹${state.amountDue}) before changing plans.` }, { status: 403 })
    }
    // A QR payment is a single month. If autopay is already running, paying by QR as well would charge twice.
    const sid = (context.subscription?.stripe_subscription_id as string | null | undefined) ?? ''
    if (state.kind === 'active' && !state.cancelAtPeriodEnd && sid && !sid.startsWith('qr:')) {
      return NextResponse.json({ error: 'Auto-renew is already on for your plan, so there is nothing to pay by QR.' }, { status: 400 })
    }

    const students = context.usage?.student_count ?? 0
    const teachers = context.usage?.teacher_count ?? 0
    if (students > plan.maxStudents || teachers > plan.maxTeachers) {
      return NextResponse.json({ error: `${plan.name} allows ${plan.limits}. You currently have ${students} students and ${teachers} teachers.` }, { status: 400 })
    }

    const qr = await createPlanQrCode({
      amount: plan.monthly,
      organizationId: context.organization.id,
      plan: planId,
      description: `ClassPilotHub ${plan.name} - 1 month`,
    })

    return NextResponse.json({
      qrId: qr.id,
      imageUrl: qr.image_url,
      amount: plan.monthly,
      planName: plan.name,
      expiresAt: qr.close_by ?? null,
    })
  } catch (error) {
    // Razorpay SDK errors are plain objects: { statusCode, error: { code, description } }
    const rzp = (error as { statusCode?: number; error?: { code?: string; description?: string } } | null) ?? {}
    console.error('Razorpay QR failed:', rzp.statusCode, rzp.error?.code, rzp.error?.description ?? error)
    return NextResponse.json({ error: 'Unable to create QR code.', detail: rzp.error?.description ?? null }, { status: 502 })
  }
}
