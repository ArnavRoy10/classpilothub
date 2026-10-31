'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'
import { createClient } from '@/lib/supabase/client'
import { formatDate, type BillingState } from '@/lib/billing-state'
import { formatINR } from '@/lib/plans'
import { useRazorpayCheckout } from '@/components/app/use-razorpay-checkout'

function useSignOut() {
  const router = useRouter()
  return async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }
}

function PayButton({ state, label }: { state: BillingState; label: string }) {
  const { busy, checkout } = useRazorpayCheckout()
  return (
    <Button size="lg" className="w-full" disabled={busy !== null} onClick={() => checkout(state.planId)}>
      {busy && <Loader2 className="mr-2 animate-spin" />}
      {label}
    </Button>
  )
}

const reasonText = (state: BillingState) =>
  state.overdueReason === 'trial'
    ? `Your 14-day free trial ended on ${formatDate(state.periodEnd)}.`
    : `Your ${state.planName} plan expired on ${formatDate(state.periodEnd)}.`

// Blocking popup shown on every page while payment is overdue but inside the grace window.
export function PaymentDuePopup({ state, isOwner, orgName }: { state: BillingState; isOwner: boolean; orgName: string }) {
  const [dismissed, setDismissed] = useState(false)
  const signOut = useSignOut()
  if (dismissed && !isOwner) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-due-title">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></div>
          <div>
            <h2 id="payment-due-title" className="text-lg font-semibold">Payment due</h2>
            <p className="text-sm text-muted-foreground">{orgName}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{reasonText(state)} Pay now to keep using ClassPilot without interruption.</p>

        <div className="my-4 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{state.planName} plan · 1 month</span>
            <span className="text-2xl font-semibold">{formatINR(state.amountDue)}</span>
          </div>
        </div>

        <p className="mb-4 text-sm font-medium text-destructive">
          Pay by {formatDate(state.suspendsAt)} ({state.daysLeft} day{state.daysLeft === 1 ? '' : 's'} left). After that your organisation will be suspended.
        </p>

        {isOwner ? (
          <div className="flex flex-col gap-2">
            <PayButton state={state} label={`Pay ${formatINR(state.amountDue)} now`} />
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Only the organisation owner can make this payment. Please ask them to pay from Settings → Billing.</p>
            <Button variant="outline" onClick={() => setDismissed(true)}>Continue for now</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Replaces the whole app once the grace period is over.
export function SuspendedScreen({ state, isOwner, orgName }: { state: BillingState; isOwner: boolean; orgName: string }) {
  const signOut = useSignOut()
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="mb-6"><Logo /></div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><Lock className="size-5" /></div>
          <h1 className="text-lg font-semibold">{orgName} is suspended</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {reasonText(state)} Payment was not received within 4 days, so access has been suspended. Your data has not been deleted and everything returns as soon as the payment is made.
        </p>
        <div className="my-4 flex items-baseline justify-between rounded-lg border bg-muted/40 p-4">
          <span className="text-sm text-muted-foreground">{state.planName} plan · 1 month</span>
          <span className="text-2xl font-semibold">{formatINR(state.amountDue)}</span>
        </div>
        <div className="flex flex-col gap-2">
          {isOwner ? <PayButton state={state} label={`Pay ${formatINR(state.amountDue)} and reactivate`} /> : <p className="text-sm text-muted-foreground">Please ask your organisation owner to complete the payment.</p>}
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    </div>
  )
}
