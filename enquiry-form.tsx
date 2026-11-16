'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EnquiryForm({ listingId }: { listingId: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setState('sending')
    setError('')
    try {
      const response = await fetch('/api/tutors/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId,
          name: form.get('name'),
          phone: form.get('phone'),
          email: form.get('email'),
          message: form.get('message'),
          website: form.get('website'), // hidden trap field for bots
        }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Could not send your enquiry.')
      setState('sent')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not send your enquiry.')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" /><p>Your enquiry was sent. They will contact you on the number or email you gave.</p></div>
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3">
      <div className="grid gap-1.5"><Label htmlFor="enq-name">Your name</Label><Input id="enq-name" name="name" required minLength={2} maxLength={80} autoComplete="name" /></div>
      <div className="grid gap-1.5"><Label htmlFor="enq-phone">Phone number</Label><Input id="enq-phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" /></div>
      <div className="grid gap-1.5"><Label htmlFor="enq-email">Email (optional)</Label><Input id="enq-email" name="email" type="email" autoComplete="email" /></div>
      <div className="grid gap-1.5"><Label htmlFor="enq-message">Message</Label><textarea id="enq-message" name="message" rows={4} maxLength={500} placeholder="Which class and subject? Any preferred timings?" className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary/60" /></div>
      <div aria-hidden="true" className="absolute -left-[9999px]"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={state === 'sending'}>{state === 'sending' ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Send data-icon="inline-start" />}Send enquiry</Button>
      <p className="text-xs text-muted-foreground">Your details are shared only with this tutor. Give a phone number or an email so they can reply.</p>
    </form>
  )
}
