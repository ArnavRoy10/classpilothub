import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListingCard } from '@/components/tutors/listing-card'
import { getAdminClient } from '@/lib/supabase/admin'
import { LISTING_TYPES, PUBLIC_COLUMNS, toPublic, type PublicListing } from '@/lib/listing'

export const metadata: Metadata = {
  title: 'Find a tutor or coaching center',
  description: 'Browse tutors, teachers and coaching centers taking new students. See subjects, fees, location and availability.',
  alternates: { canonical: '/tutors' },
}
export const dynamic = 'force-dynamic'

type Params = { q?: string; type?: string; mode?: string; city?: string; available?: string }

const selectClass = 'border-input bg-background h-10 w-full rounded-md border px-3 text-sm'

export default async function TutorsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const q = (params.q ?? '').trim().toLowerCase()
  const type = params.type ?? ''
  const mode = params.mode ?? ''
  const city = (params.city ?? '').trim().toLowerCase()
  const onlyAvailable = params.available === '1'

  let all: PublicListing[] = []
  try {
    const { data } = await getAdminClient().from('public_listings').select(PUBLIC_COLUMNS).eq('is_visible', true).order('updated_at', { ascending: false }).limit(500)
    all = (data ?? []).map((row) => toPublic(row as Record<string, unknown>))
  } catch (error) {
    console.error('[tutors] could not load listings', error)
  }

  const order = { available: 0, limited: 1, full: 2 } as const
  const results = all
    .filter((item) => !type || item.listing_type === type)
    .filter((item) => !mode || item.teaching_mode === 'both' || item.teaching_mode === mode)
    .filter((item) => !city || (item.city ?? '').toLowerCase().includes(city))
    .filter((item) => !onlyAvailable || item.availability !== 'full')
    .filter((item) => !q || [item.display_name, item.tagline, item.classes, item.city, item.area, ...item.subjects].join(' ').toLowerCase().includes(q))
    .sort((a, b) => order[a.availability] - order[b.availability])

  const cities = [...new Set(all.map((item) => item.city).filter((value): value is string => Boolean(value)))].sort()
  const topSubjects = Object.entries(all.flatMap((item) => item.subjects).reduce<Record<string, number>>((counts, subject) => ({ ...counts, [subject]: (counts[subject] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([subject]) => subject)

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="aurora absolute inset-0 -z-10 opacity-70" />
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-8 sm:px-6 sm:pt-20">
          <p className="text-sm font-medium text-neon">Tutor directory</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">Find a tutor or coaching center</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Browse people and centers who are taking new students. Contact them directly or send an enquiry.</p>

          <form method="get" className="glass mt-8 grid gap-3 rounded-2xl p-4 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input name="q" defaultValue={params.q ?? ''} placeholder="Search a subject, name or area" aria-label="Search" className="border-input bg-background h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:border-primary/60" />
            </div>
            <select name="type" defaultValue={type} aria-label="Type" className={selectClass}><option value="">Anyone</option>{LISTING_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select name="mode" defaultValue={mode} aria-label="Teaching mode" className={selectClass}><option value="">Online or in person</option><option value="online">Online</option><option value="in_person">In person</option></select>
            <select name="city" defaultValue={params.city ?? ''} aria-label="City" className={selectClass}><option value="">Any city</option>{cities.map((name) => <option key={name} value={name}>{name}</option>)}</select>
            <Button type="submit" size="lg">Search</Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-5"><input type="checkbox" name="available" value="1" defaultChecked={onlyAvailable} className="size-4 accent-[var(--primary)]" />Only show those taking new students</label>
          </form>

          {topSubjects.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {topSubjects.map((subject) => <Link key={subject} href={`/tutors?q=${encodeURIComponent(subject)}`} className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 hover:bg-white/10">{subject}</Link>)}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6" aria-label="Results">
        <p className="mb-5 text-sm text-muted-foreground">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">{all.length === 0 ? 'No tutors are listed yet.' : 'Nothing matches your search.'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{all.length === 0 ? 'Be the first to list your classes.' : 'Try a different subject, or clear the filters.'}</p>
            {all.length > 0 && <Button variant="outline" className="mt-4" render={<Link href="/tutors" />}>Clear filters</Button>}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{results.map((item) => <ListingCard key={item.id} listing={item} href={`/tutors/${item.id}`} />)}</div>
        )}

        <div className="glass mt-14 flex flex-col items-start justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
          <div><p className="font-display text-xl font-semibold">Teach or run a center?</p><p className="text-sm text-muted-foreground">Create a free profile, switch it on when you have seats, and let students find you.</p></div>
          <Button render={<Link href="/signup" />}>List yourself</Button>
        </div>
      </section>
    </>
  )
}
