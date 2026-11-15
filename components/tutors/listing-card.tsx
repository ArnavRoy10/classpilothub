import Link from 'next/link'
import { ArrowRight, BookOpen, Building2, GraduationCap, IndianRupee, MapPin, Monitor, Phone, type LucideIcon } from 'lucide-react'
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
