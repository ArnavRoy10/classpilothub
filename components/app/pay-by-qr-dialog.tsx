'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS, formatINR, type PlanId } from '@/lib/plans'

type QrResult = { qrId?: string; imageUrl?: string; amount?: number; planName?: string; expiresAt?: number | null; error?: string; detail?: string | null }
type Status = { kind?: string; periodEnd?: string | null }

async function readStatus(): Promise<Status> {
  const response = await fetch('/api/billing/status', { cache: 'no-store' })
  return (await response.json()) as Status
}

// Shows a one-time UPI QR for one month of `plan` and waits until the webhook has activated it.
export function PayByQrModal({ plan, onClose }: { plan: PlanId; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0)
  const [qr, setQr] = useState<QrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    setQr(null)
    setError(null)
    setExpired(false)

    async function start() {
      try {
        // Remember the period end before paying: a changed period end is how we know the payment landed.
        const before = await readStatus()
        const response = await fetch('/api/billing/razorpay-qr', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) })
        const result = (await response.json()) as QrResult
        if (!response.ok || !result.imageUrl) throw new Error([result.error ?? 'Unable to create QR code.', result.detail].filter(Boolean).join(' '))
        if (cancelled) return
        setQr(result)

        const expiresAt = (result.expiresAt ?? 0) * 1000
        timer = setInterval(async () => {
          if (expiresAt && Date.now() > expiresAt) {
            if (timer) clearInterval(timer)
            setExpired(true)
            return
          }
          try {
            const now = await readStatus()
            if (now.kind === 'active' && now.periodEnd !== before.periodEnd) {
              if (timer) clearInterval(timer)
              if (cancelled) return
              setPaid(true)
              toast.success('Payment received. Your plan is active.')
              setTimeout(() => window.location.reload(), 1500)
            }
          } catch {
            // keep polling
          }
        }, 3000)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to create QR code.')
      }
    }

    start()
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [plan, attempt])

  const item = PLANS[plan]

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pay-qr-title">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl">
        <h2 id="pay-qr-title" className="text-lg font-semibold">Pay by QR</h2>
        <p className="text-sm text-muted-foreground">{item.name} plan · 1 month</p>
        <p className="my-3 text-2xl font-semibold">{formatINR(item.monthly)}</p>

        <div className="flex min-h-56 items-center justify-center rounded-lg border bg-white p-3">
          {error ? (
            <p className="text-center text-sm text-destructive">{error}</p>
          ) : paid ? (
            <CheckCircle2 className="size-16 text-emerald-500" />
          ) : !qr ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : expired ? (
            <p className="text-center text-sm text-muted-foreground">This QR has expired.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr.imageUrl} alt={`UPI QR code to pay ${formatINR(item.monthly)}`} className="size-52" />
          )}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {paid
            ? 'Payment confirmed.'
            : 'Scan with any UPI app (Google Pay, PhonePe, Paytm, BHIM). Keep this window open until the payment is confirmed. The QR is valid for 15 minutes.'}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {(expired || error) && <Button onClick={() => setAttempt((n) => n + 1)}>Generate a new QR</Button>}
          <Button variant="outline" onClick={onClose}>{paid ? 'Close' : 'Cancel'}</Button>
        </div>
      </div>
    </div>
  )
}

export function PayByQrButton({ plan, amount }: { plan: PlanId; amount: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <QrCode data-icon="inline-start" />
        Pay {formatINR(amount)} by QR
      </Button>
      {open && <PayByQrModal plan={plan} onClose={() => setOpen(false)} />}
    </>
  )
}
