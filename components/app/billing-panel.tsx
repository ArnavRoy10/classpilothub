'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, CalendarClock, Check, Clock, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRazorpayCheckout } from '@/components/app/use-razorpay-checkout'
import { PayByQrModal } from '@/components/app/pay-by-qr-dialog'
import { formatDate, type BillingState } from '@/lib/billing-state'
import { PLAN_ORDER, PLANS, formatINR, type PlanId } from '@/lib/plans'

type Props = {
  organization: { id: string; name: string; max_students: number; max_teachers: number }
  subscription: { stripe_subscription_id?: string | null; cancel_at_period_end?: boolean | null } | null
  usage: { student_count: number; teacher_count: number } | null
  state: BillingState
  canManage: boolean
}

const statusBadge: Record<BillingState['kind'], { label: string; className: string }> = {
  trial: { label: 'Free trial', className: 'bg-secondary text-secondary-foreground' },
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  grace: { label: 'Payment due', className: 'bg-destructive/10 text-destructive' },
  suspended: { label: 'Suspended', className: 'bg-destructive/10 text-destructive' },
  unknown: { label: 'Free trial', className: 'bg-secondary text-secondary-foreground' },
}

export function BillingPanel({ organization, subscription, usage, state, canManage }: Props) {
  const router = useRouter()
  const { busy: checkoutBusy, checkout } = useRazorpayCheckout()
  const [busy, setBusy] = useState<string | null>(null)
  const [qrPlan, setQrPlan] = useState<PlanId | null>(null)
  const working = busy !== null || checkoutBusy !== null
  const plan = PLANS[state.planId]
  const badge = statusBadge[state.kind]

  async function selectTrialPlan(planId: PlanId) {
    setBusy(planId)
    try {
      const response = await fetch('/api/billing/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: planId }) })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Unable to change plan.')
      toast.success(`${PLANS[planId].name} selected. Payment starts after your free trial.`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to change plan')
    } finally {
      setBusy(null)
    }
  }

  async function cancelSubscription() {
    setBusy('cancel')
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST' })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Unable to cancel subscription.')
      toast.success('Your plan will end at the end of the current period.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to cancel subscription')
    } finally {
      setBusy(null)
    }
  }

  // QR is a one-off payment for one month, so it is offered only where no autopay is already running
  // and the plan is not still in its free trial. Mirrors the checks in /api/billing/razorpay-qr.
  const sid = subscription?.stripe_subscription_id ?? ''
  const autoRenewOn = state.kind === 'active' && !state.cancelAtPeriodEnd && Boolean(sid) && !sid.startsWith('qr:')
  function canPayByQr(planId: PlanId) {
    if (!canManage || working || state.kind === 'trial' || state.kind === 'unknown') return false
    if (state.mustPay) return planId === state.planId
    return state.kind === 'active' && !autoRenewOn
  }

  function buttonFor(planId: PlanId) {
    const isCurrent = planId === state.planId
    const label = (text: string) => (<>{(busy === planId || checkoutBusy === planId) && <Loader2 className="mr-2 animate-spin" />}{text}</>)

    if (!canManage) return { disabled: true, variant: 'secondary' as const, content: label(isCurrent ? 'Current plan' : 'Owner only'), onClick: () => {} }

    // Overdue: the only thing allowed is paying the current plan.
    if (state.mustPay) {
      return isCurrent
        ? { disabled: working, variant: 'default' as const, content: label(`Pay ${formatINR(state.amountDue)} now`), onClick: () => checkout(planId) }
        : { disabled: true, variant: 'secondary' as const, content: label('Pay pending bill first'), onClick: () => {} }
    }

    if (state.kind === 'active') {
      if (isCurrent && !state.cancelAtPeriodEnd) return { disabled: true, variant: 'secondary' as const, content: label('Current plan'), onClick: () => {} }
      return { disabled: working, variant: 'default' as const, content: label(isCurrent ? 'Renew this plan' : 'Switch at renewal'), onClick: () => checkout(planId) }
    }

    // Free trial (or no dates on record): choosing a plan is free, payment comes after the trial.
    if (isCurrent) return { disabled: true, variant: 'secondary' as const, content: label('Selected'), onClick: () => {} }
    return { disabled: working, variant: 'default' as const, content: label('Select plan'), onClick: () => selectTrialPlan(planId) }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Current Plan
            <Badge className={`font-normal ${badge.className}`}>{badge.label}</Badge>
          </CardTitle>
          <CardDescription>{organization.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-2xl font-semibold">{plan.name} plan <span className="text-base font-normal text-muted-foreground">{formatINR(plan.monthly)}/month</span></p>
            <p className="text-sm text-muted-foreground">
              {usage?.student_count ?? 0}/{organization.max_students} students · {usage?.teacher_count ?? 0}/{organization.max_teachers} teachers
            </p>
          </div>
          {canManage && state.kind === 'active' && subscription?.stripe_subscription_id && !state.cancelAtPeriodEnd && (
            <Button variant="outline" onClick={cancelSubscription} disabled={working}>
              {busy === 'cancel' && <Loader2 className="mr-2 animate-spin" />}
              Cancel at period end
            </Button>
          )}
        </CardContent>
      </Card>

      {state.mustPay ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{formatINR(state.amountDue)} is overdue</AlertTitle>
          <AlertDescription>
            Your {state.overdueReason === 'trial' ? 'free trial' : `${state.planName} plan`} ended on {formatDate(state.periodEnd)}.
            Pay by {formatDate(state.suspendsAt)} ({state.daysLeft} day{state.daysLeft === 1 ? '' : 's'} left) or your organisation will be suspended.
            Plans can be changed once the bill is cleared.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="bg-muted/40">
          <CardContent className="flex items-start gap-3 py-4">
            {state.kind === 'trial' ? <Clock className="mt-0.5 size-4 text-muted-foreground" /> : <CalendarClock className="mt-0.5 size-4 text-muted-foreground" />}
            <div className="text-sm">
              {state.kind === 'trial' && (
                <>
                  <p className="font-medium">Free trial ends on {formatDate(state.periodEnd)} ({state.daysLeft} day{state.daysLeft === 1 ? '' : 's'} left)</p>
                  <p className="text-muted-foreground">You will need to pay {formatINR(state.amountDue)} for the {state.planName} plan after the trial. Nothing is charged until then, and you can change plan freely before it ends.</p>
                </>
              )}
              {state.kind === 'active' && !state.cancelAtPeriodEnd && (
                <>
                  <p className="font-medium">Plan valid until {formatDate(state.periodEnd)} ({state.daysLeft} day{state.daysLeft === 1 ? '' : 's'} left)</p>
                  <p className="text-muted-foreground">Next payment: {formatINR(state.amountDue)} on {formatDate(state.periodEnd)}. A plan change takes effect from that date.</p>
                </>
              )}
              {state.kind === 'active' && state.cancelAtPeriodEnd && (
                <>
                  <p className="font-medium">Your plan ends on {formatDate(state.periodEnd)} ({state.daysLeft} day{state.daysLeft === 1 ? '' : 's'} left)</p>
                  <p className="text-muted-foreground">It will not renew. To continue, renew before it ends: {formatINR(state.amountDue)}/month.</p>
                </>
              )}
              {(state.kind === 'unknown') && <p className="text-muted-foreground">No billing dates on record yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const item = PLANS[id]
          const action = buttonFor(id)
          return (
            <Card key={id} className={id === state.planId ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>{item.limits}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-2xl font-semibold">
                  {formatINR(item.monthly)}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><Check className="size-4 text-primary" />Unlimited attendance</li>
                  <li className="flex gap-2"><Check className="size-4 text-primary" />Reports and notifications</li>
                </ul>
                <Button className="w-full" variant={action.variant} disabled={action.disabled} onClick={action.onClick}>{action.content}</Button>
                {canPayByQr(id) && <Button className="w-full" variant="outline" onClick={() => setQrPlan(id)}>Pay {formatINR(item.monthly)} by QR</Button>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {qrPlan && <PayByQrModal plan={qrPlan} onClose={() => setQrPlan(null)} />}
    </div>
  )
}
