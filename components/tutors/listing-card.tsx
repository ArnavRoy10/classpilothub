'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, BookOpen, Building2, CheckCircle2, GraduationCap, IndianRupee, Loader2, MapPin, Monitor, Phone, Send, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { availabilityLabel, feeText, initialsOf, modeLabel, typeLabel, type PublicListing } from '@/lib/listing'

const typeIcon: Record<PublicListing['listing_type'], LucideIcon> = { home_tutor: GraduationCap, teacher: BookOpen, coaching_center: Building2 }
const typeHue: Record<PublicListing['listing_type'], string> = { home_tutor: 'var(--h2)', teacher: 'var(--h1)', coaching_center: 'var(--h3)' }
const availabilityClass: Record<PublicListing['availability'], string> = {
  available: 'bg-emerald-500/15 text-emerald-300',
  limited: 'bg-amber-500/15 text-amber-300',
  full: 'bg-muted text-muted-foreground',
}

export function AvailabilityPill({ value }: { value: PublicListing['availability'] }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${availabilityClass[value]}`}><span className="size-1.5 rounded-full bg-current" />{availabilityLabel(value)}</span>
}

// One tutor / center in the list. Also used for the live preview in the owner's editor (no link then).
export function ListingCard({ listing, href }: { listing: PublicListing; href?: string }) {
  const Icon = typeIcon[listing.listing_type]
  const hue = typeHue[listing.listing_type]
  const place = [listing.area, listing.city].filter(Boolean).join(', ')
  const fee = feeText(listing)

  return (
    <article className="glass relative flex h-full flex-col overflow-hidden rounded-2xl p-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: `linear-gradient(135deg, oklch(0.7 0.16 ${hue} / 18%), transparent 60%)` }} />
      <div className="relative flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold ring-1 ring-white/10" style={{ background: `oklch(0.7 0.16 ${hue} / 22%)`, color: `oklch(0.9 0.1 ${hue})` }}>{initialsOf(listing.display_name)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold">{listing.display_name || 'Your name'}</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{typeLabel(listing.listing_type)}</p>
        </div>
        <AvailabilityPill value={listing.availability} />
      </div>

      {listing.tagline && <p className="relative mt-3 line-clamp-2 text-sm text-muted-foreground">{listing.tagline}</p>}

      {listing.subjects.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {listing.subjects.slice(0, 5).map((subject) => <span key={subject} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs ring-1 ring-white/10">{subject}</span>)}
          {listing.subjects.length > 5 && <span className="px-1 py-0.5 text-xs text-muted-foreground">+{listing.subjects.length - 5}</span>}
        </div>
      )}

      <ul className="relative mt-4 flex flex-1 flex-col gap-1.5 text-sm text-muted-foreground">
        {place && <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0" aria-hidden="true" />{place}</li>}
        <li className="flex items-center gap-2"><Monitor className="size-4 shrink-0" aria-hidden="true" />{modeLabel(listing.teaching_mode)}{listing.classes ? ` · ${listing.classes}` : ''}</li>
        {fee && <li className="flex items-center gap-2"><IndianRupee className="size-4 shrink-0" aria-hidden="true" />{fee}</li>}
      </ul>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        {href ? <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">View profile<ArrowRight className="size-4" aria-hidden="true" /></Link> : <span className="text-sm text-muted-foreground">Preview</span>}
        {listing.phone && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="size-3.5" aria-hidden="true" />{listing.phone}</span>}
      </div>
    </article>
  )
}

// The enquiry form on a tutor's profile page.
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
