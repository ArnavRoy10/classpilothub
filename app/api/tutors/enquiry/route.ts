import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { phoneOf } from '@/lib/listing'

// Public endpoint: a student sends an enquiry to a listed tutor. Protected against spam.
const recent = new Map<string, number[]>()
function tooMany(key: string, limit: number) {
  const now = Date.now()
  const times = (recent.get(key) ?? []).filter((time) => now - time < 3_600_000)
  if (times.length >= limit) { recent.set(key, times); return true }
  times.push(now)
  recent.set(key, times)
  return false
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail('Invalid request.')

  // Bots fill the hidden field: pretend it worked.
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ ok: true })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooMany(`ip:${ip}`, 6)) return fail('You have sent several enquiries. Please try again later.', 429)

  const listingId = String(body.listingId ?? '')
  const name = String(body.name ?? '').trim()
  const message = String(body.message ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const phone = phoneOf(String(body.phone ?? '').slice(0, 24))

  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return fail('Invalid tutor.')
  if (name.length < 2 || name.length > 80) return fail('Enter your name.')
  if (phone.invalid) return fail('The phone number must have 7 to 15 digits.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.')
  if (!phone.value && !email) return fail('Give a phone number or an email so they can reply.')
  if (message.length > 500) return fail('The message is too long (500 characters at most).')
  if (tooMany(`listing:${ip}:${listingId}`, 2)) return fail('You already sent this tutor an enquiry. Please wait for a reply.', 429)

  try {
    const admin = getAdminClient()
    const { data: listing } = await admin.from('public_listings').select('id, organization_id, availability').eq('id', listingId).eq('is_visible', true).maybeSingle()
    if (!listing) return fail('This tutor is not available.', 404)
    if (listing.availability === 'full') return fail('This tutor is full right now.', 409)

    const { error } = await admin.from('listing_enquiries').insert({
      listing_id: listing.id,
      organization_id: listing.organization_id,
      student_name: name,
      phone: phone.value,
      email: email || null,
      message: message || null,
    })
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[tutors] enquiry failed', error)
    return fail('Could not send your enquiry. Please try again.', 500)
  }
}
