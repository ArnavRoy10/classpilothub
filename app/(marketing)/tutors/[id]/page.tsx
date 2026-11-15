import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Globe, IndianRupee, Mail, MapPin, MessageCircle, Monitor, Phone, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AvailabilityPill } from '@/components/tutors/listing-card'
import { EnquiryForm } from '@/components/tutors/enquiry-form'
import { getAdminClient } from '@/lib/supabase/admin'
import { PUBLIC_COLUMNS, feeText, initialsOf, modeLabel, toPublic, typeLabel, type PublicListing } from '@/lib/listing'

export const revalidate = 60

async function load(id: string): Promise<PublicListing | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  try {
    const { data } = await getAdminClient().from('public_listings').select(PUBLIC_COLUMNS).eq('id', id).eq('is_visible', true).maybeSingle()
    return data ? toPublic(data as Record<string, unknown>) : null
  } catch (error) {
    console.error('[tutors] could not load listing', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const listing = await load((await params).id)
  if (!listing) return { title: 'Not found' }
  return { title: listing.display_name, description: listing.tagline ?? `${typeLabel(listing.listing_type)} in ${listing.city ?? 'your area'}.`, alternates: { canonical: `/tutors/${listing.id}` } }
}

export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const listing = await load((await params).id)
  if (!listing) notFound()

  const place = [listing.area, listing.city].filter(Boolean).join(', ')
  const fee = feeText(listing)
  const whatsappDigits = listing.whatsapp?.replace(/\D/g, '')

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/tutors" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All tutors</Link>

      <header className="glass mt-4 flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center">
        <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary/20 font-display text-2xl font-semibold text-primary">{initialsOf(listing.display_name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs ring-1 ring-white/10">{typeLabel(listing.listing_type)}</span><AvailabilityPill value={listing.availability} /></div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{listing.display_name}</h1>
          {listing.tagline && <p className="mt-1 text-muted-foreground">{listing.tagline}</p>}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          {listing.about && <section className="glass rounded-2xl p-6"><h2 className="font-display text-xl font-semibold">About</h2><p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">{listing.about}</p></section>}

          <section className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold">Details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {listing.subjects.length > 0 && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Subjects</dt><dd className="mt-1.5 flex flex-wrap gap-1.5">{listing.subjects.map((subject) => <span key={subject} className="rounded-full bg-white/5 px-3 py-1 text-sm ring-1 ring-white/10">{subject}</span>)}</dd></div>}
              {listing.classes && <div><dt className="text-xs text-muted-foreground">Classes</dt><dd className="mt-1 font-medium">{listing.classes}</dd></div>}
              <div><dt className="text-xs text-muted-foreground">Teaching mode</dt><dd className="mt-1 flex items-center gap-2 font-medium"><Monitor className="size-4 text-primary" />{modeLabel(listing.teaching_mode)}</dd></div>
              {fee && <div><dt className="text-xs text-muted-foreground">Fees</dt><dd className="mt-1 flex items-center gap-2 font-medium"><IndianRupee className="size-4 text-primary" />{fee}</dd></div>}
              {listing.experience_years !== null && <div><dt className="text-xs text-muted-foreground">Experience</dt><dd className="mt-1 font-medium">{listing.experience_years} {listing.experience_years === 1 ? 'year' : 'years'}</dd></div>}
              {listing.seats_open !== null && <div><dt className="text-xs text-muted-foreground">Open seats</dt><dd className="mt-1 flex items-center gap-2 font-medium"><Users className="size-4 text-primary" />{listing.seats_open}</dd></div>}
              {(place || listing.address) && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Location</dt><dd className="mt-1 flex items-start gap-2 font-medium"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span>{listing.address ? `${listing.address}${listing.pincode ? ` – ${listing.pincode}` : ''}` : place}{listing.address && place ? <span className="block text-sm font-normal text-muted-foreground">{place}</span> : null}</span></dd></div>}
            </dl>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          {(listing.phone || listing.whatsapp || listing.email || listing.website) && (
            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold">Contact</h2>
              <div className="mt-4 flex flex-col gap-2">
                {listing.phone && <Button render={<a href={`tel:${listing.phone}`} />}><Phone data-icon="inline-start" />Call {listing.phone}</Button>}
                {whatsappDigits && <Button variant="outline" render={<a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" />}><MessageCircle data-icon="inline-start" />WhatsApp</Button>}
                {listing.email && <Button variant="outline" render={<a href={`mailto:${listing.email}`} />}><Mail data-icon="inline-start" />{listing.email}</Button>}
                {listing.website && <Button variant="ghost" render={<a href={listing.website} target="_blank" rel="noopener noreferrer nofollow" />}><Globe data-icon="inline-start" />Website</Button>}
              </div>
            </section>
          )}

          <section className="glass rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold">Send an enquiry</h2>
            {listing.availability === 'full'
              ? <p className="mt-3 text-sm text-muted-foreground">This tutor is full right now. Browse others in the directory.</p>
              : <EnquiryForm listingId={listing.id} />}
          </section>

          <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />Meet in a safe, public place for a first visit, and never pay in advance to someone you have not met.</p>
        </aside>
      </div>
    </div>
  )
}
