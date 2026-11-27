'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/billing-state'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

type CheckoutResult = { keyId?: string; subscriptionId?: string; plan?: string; scheduledFor?: string | null; error?: string; detail?: string | null }

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// The webhook can take a few seconds; wait until the organisation reads as paid.
async function waitUntilPaid() {
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    try {
      const response = await fetch('/api/billing/status', { cache: 'no-store' })
      const data = (await response.json()) as { kind?: string }
      if (data.kind === 'active') return true
    } catch {
      // keep polling
    }
  }
  return false
}

export function useRazorpayCheckout() {
  const [busy, setBusy] = useState<string | null>(null)

  const checkout = useCallback(async (plan: string) => {
    setBusy(plan)
    try {
      if (!(await loadRazorpayScript())) throw new Error('Unable to load Razorpay checkout. Check your connection and try again.')

      const response = await fetch('/api/billing/razorpay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) })
      const result = (await response.json()) as CheckoutResult
      if (!response.ok || !result.keyId || !result.subscriptionId) {
        throw new Error([result.error ?? 'Unable to start checkout.', result.detail].filter(Boolean).join(' '))
      }

      await new Promise<void>((resolve, reject) => {
        const razorpay = new window.Razorpay!({
          key: result.keyId,
          subscription_id: result.subscriptionId,
          name: 'ClassPilotHub',
          description: `${result.plan} plan`,
          theme: { color: '#5b8cff' },
          handler: () => resolve(),
          modal: { ondismiss: () => reject(new Error('dismissed')) },
        })
        razorpay.open()
      })

      await fetch('/api/billing/razorpay/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscriptionId: result.subscriptionId }) }).catch(() => null)

      if (result.scheduledFor) {
        toast.success(`Plan change scheduled. ${result.plan} starts on ${formatDate(result.scheduledFor)}.`)
        window.location.reload()
        return
      }
      toast.success('Payment received. Activating your plan…')
      await waitUntilPaid()
      window.location.reload()
    } catch (error) {
      if (!(error instanceof Error && error.message === 'dismissed')) toast.error(error instanceof Error ? error.message : 'Unable to start checkout')
      setBusy(null)
    }
  }, [])

  return { busy, checkout }
}
