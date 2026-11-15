'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Eye, EyeOff, Inbox, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ListingCard } from '@/components/tutors/listing-card'
import { saveListing, setEnquiryStatus, setListingFlags } from '@/app/(app)/listing/actions'
import { AVAILABILITY, FEE_PERIODS, LISTING_TYPES, TEACHING_MODES, toPublic, type Availability, type FeePeriod, type Listing, type ListingType, type TeachingMode } from '@/lib/listing'

export type EnquiryRow = { id: string; student_name: string; phone: string | null; email: string | null; message: string | null; status: string; created_at: string }

type Form = {
  listing_type: ListingType; display_name: string; tagline: string; about: string; subjects: string; classes: string
  city: string; area: string; address: string; pincode: string
  phone: string; whatsapp: string; email: string; website: string
  show_phone: boolean; show_address: boolean; show_email: boolean
  teaching_mode: TeachingMode; fee_from: string; fee_to: string; fee_period: FeePeriod; experience_years: string; seats_open: string
}

const selectClass = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm'
const textareaClass = 'border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary/60'

function Tick({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>
}

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-muted'}`}>
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function fromListing(listing: Listing | null, defaults: { display_name: string; email: string; listing_type: ListingType }): Form {
  return {
    listing_type: listing?.listing_type ?? defaults.listing_type,
    display_name: listing?.display_name ?? defaults.display_name,
    tagline: listing?.tagline ?? '',
    about: listing?.about ?? '',
    subjects: (listing?.subjects ?? []).join(', '),
    classes: listing?.classes ?? '',
    city: listing?.city ?? '',
    area: listing?.area ?? '',
    address: listing?.address ?? '',
    pincode: listing?.pincode ?? '',
    phone: listing?.phone ?? '',
    whatsapp: listing?.whatsapp ?? '',
    email: listing?.email ?? defaults.email,
    website: listing?.website ?? '',
    show_phone: listing?.show_phone ?? true,
    show_address: listing?.show_address ?? false,
    show_email: listing?.show_email ?? false,
    teaching_mode: listing?.teaching_mode ?? 'in_person',
    fee_from: listing?.fee_from?.toString() ?? '',
    fee_to: listing?.fee_to?.toString() ?? '',
    fee_period: listing?.fee_period ?? 'month',
    experience_years: listing?.experience_years?.toString() ?? '',
    seats_open: listing?.seats_open?.toString() ?? '',
  }
}

export function ListingEditor({ listing, enquiries, defaults }: { listing: Listing | null; enquiries: EnquiryRow[]; defaults: { display_name: string; email: string; listing_type: ListingType } }) {
  const [form, setForm] = useState<Form>(() => fromListing(listing, defaults))
  const [id, setId] = useState<string | null>(listing?.id ?? null)
  const [visible, setVisible] = useState(listing?.is_visible ?? false)
  const [availability, setAvailability] = useState<Availability>(listing?.availability ?? 'available')
  const [rows, setRows] = useState<EnquiryRow[]>(enquiries)
  const [pending, start] = useTransition()
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }))

  const preview = toPublic({
    ...form,
    id: id ?? 'preview',
    subjects: form.subjects.split(',').map((item) => item.trim()).filter(Boolean),
    fee_from: form.fee_from === '' ? null : Number(form.fee_from),
    fee_to: form.fee_to === '' ? null : Number(form.fee_to),
    experience_years: form.experience_years === '' ? null : Number(form.experience_years),
    seats_open: form.seats_open === '' ? null : Number(form.seats_open),
    availability,
  })

  function save() {
    start(async () => {
      const result = await saveListing({ ...form })
      if (result.ok) { toast.success('Saved. Your changes are live if your profile is switched on.'); if (result.id) setId(result.id) }
      else toast.error(result.message)
    })
  }

  function flip(next: boolean) {
    start(async () => {
      const result = await setListingFlags({ is_visible: next })
      if (result.ok) { setVisible(next); toast.success(result.message) } else toast.error(result.message)
    })
  }

  function chooseAvailability(next: Availability) {
    start(async () => {
      const result = await setListingFlags({ availability: next })
      if (result.ok) { setAvailability(next); toast.success(result.message) } else toast.error(result.message)
    })
  }

  function changeStatus(enquiryId: string, status: string) {
    start(async () => {
      const result = await setEnquiryStatus(enquiryId, status)
      if (result.ok) setRows((current) => current.map((row) => (row.id === enquiryId ? { ...row, status } : row)))
      else toast.error(result.message)
    })
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{visible ? <Eye className="size-4 text-primary" /> : <EyeOff className="size-4 text-muted-foreground" />}Visibility and availability</CardTitle>
            <CardDescription>Switch these any time. They save instantly. Save your details first.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div><p className="font-medium">Show me in the public list</p><p className="text-sm text-muted-foreground">{visible ? 'Students can find your profile at /tutors.' : 'Hidden. Nobody can see your profile.'}</p></div>
              <Switch checked={visible} onChange={flip} disabled={pending || !id} label="Show me in the public list" />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Are you taking new students?</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABILITY.map((item) => (
                  <button key={item.value} type="button" disabled={pending || !id} onClick={() => chooseAvailability(item.value)} className={`rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${availability === item.value ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>{item.label}</button>
                ))}
              </div>
            </div>
            {id && visible && <a href={`/tutors/${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Open my public page<ExternalLink className="size-3.5" /></a>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>About you</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>I am a…</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {LISTING_TYPES.map((item) => (
                  <button key={item.value} type="button" onClick={() => set('listing_type', item.value)} className={`rounded-xl border p-3 text-left transition-colors ${form.listing_type === item.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p></button>
                ))}
              </div>
            </div>
            <div className="grid gap-2"><Label htmlFor="l-name">Name shown to students</Label><Input id="l-name" value={form.display_name} maxLength={80} onChange={(e) => set('display_name', e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="l-tag">One-line tagline</Label><Input id="l-tag" value={form.tagline} maxLength={140} placeholder="Maths and Science for classes 6 to 12" onChange={(e) => set('tagline', e.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="l-about">About</Label><textarea id="l-about" rows={5} maxLength={2000} className={textareaClass} value={form.about} placeholder="Your experience, teaching style, results, anything students and parents should know." onChange={(e) => set('about', e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="l-subjects">Subjects (separate with commas)</Label><Input id="l-subjects" value={form.subjects} placeholder="Maths, Physics, Chemistry" onChange={(e) => set('subjects', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="l-classes">Classes or levels</Label><Input id="l-classes" value={form.classes} maxLength={100} placeholder="Class 6 – 12, JEE" onChange={(e) => set('classes', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="l-mode">Teaching mode</Label><select id="l-mode" className={selectClass} value={form.teaching_mode} onChange={(e) => set('teaching_mode', e.target.value as TeachingMode)}>{TEACHING_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div className="grid gap-2"><Label htmlFor="l-exp">Years of experience</Label><Input id="l-exp" type="number" min={0} max={60} value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="l-seats">Open seats (optional)</Label><Input id="l-seats" type="number" min={0} value={form.seats_open} onChange={(e) => set('seats_open', e.target.value)} /></div>
            </div>
            <div className="grid gap-2">
              <Label>Fees (optional)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">₹</span><Input aria-label="Lowest fee" type="number" min={0} className="w-28" value={form.fee_from} onChange={(e) => set('fee_from', e.target.value)} />
                <span className="text-sm text-muted-foreground">to ₹</span><Input aria-label="Highest fee" type="number" min={0} className="w-28" value={form.fee_to} onChange={(e) => set('fee_to', e.target.value)} />
                <select aria-label="Fee period" className={`${selectClass} w-36`} value={form.fee_period} onChange={(e) => set('fee_period', e.target.value as FeePeriod)}>{FEE_PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Where and how to reach you</CardTitle><CardDescription>You decide what is public. Anything not ticked is never shown to visitors.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="l-city">City or town</Label><Input id="l-city" value={form.city} maxLength={60} onChange={(e) => set('city', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="l-area">Area or locality</Label><Input id="l-area" value={form.area} maxLength={80} onChange={(e) => set('area', e.target.value)} /></div>
              <div className="grid gap-2 sm:col-span-2"><Label htmlFor="l-address">Full address</Label><Input id="l-address" value={form.address} maxLength={200} onChange={(e) => set('address', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="l-pin">Pincode</Label><Input id="l-pin" value={form.pincode} maxLength={12} onChange={(e) => set('pincode', e.target.value)} /></div>
              <div className="flex items-end pb-2"><Tick checked={form.show_address} onChange={(value) => set('show_address', value)} label="Show full address and pincode on my public page" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="l-phone">Phone number</Label><Input id="l-phone" inputMode="tel" value={form.phone} placeholder="+91 98765 43210" onChange={(e) => set('phone', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="l-wa">WhatsApp number</Label><Input id="l-wa" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></div>
              <div className="sm:col-span-2"><Tick checked={form.show_phone} onChange={(value) => set('show_phone', value)} label="Show my phone and WhatsApp number on my public page" /></div>
              <div className="grid gap-2"><Label htmlFor="l-email">Email</Label><Input id="l-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="l-web">Website (optional)</Label><Input id="l-web" value={form.website} placeholder="https://" onChange={(e) => set('website', e.target.value)} /></div>
              <div className="sm:col-span-2"><Tick checked={form.show_email} onChange={(value) => set('show_email', value)} label="Show my email on my public page" /></div>
            </div>
            <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">Phone numbers shown on a public page can receive unwanted calls. If you prefer, leave the phone unticked: students can still reach you through the enquiry form, and you will see their messages below.</p>
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-10"><Button size="lg" onClick={save} disabled={pending} className="w-full shadow-lg sm:w-auto"><Save data-icon="inline-start" />{pending ? 'Saving…' : 'Save details'}</Button></div>
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-24">
        <Card>
          <CardHeader><CardTitle>How students see you</CardTitle><CardDescription>A live preview of your card in the list.</CardDescription></CardHeader>
          <CardContent><ListingCard listing={preview} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Inbox className="size-4 text-primary" />Student enquiries ({rows.length})</CardTitle><CardDescription>Messages sent from your public page.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rows.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No enquiries yet.</p> : rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate font-medium">{row.student_name}</p><p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString('en-IN')}</p></div>
                  <select aria-label="Enquiry status" className="border-input bg-background rounded-md border px-2 py-1 text-xs" value={row.status} onChange={(e) => changeStatus(row.id, e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select>
                </div>
                {row.message && <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{row.message}</p>}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {row.phone && <a className="text-primary hover:underline" href={`tel:${row.phone}`}>{row.phone}</a>}
                  {row.email && <a className="text-primary hover:underline" href={`mailto:${row.email}`}>{row.email}</a>}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
