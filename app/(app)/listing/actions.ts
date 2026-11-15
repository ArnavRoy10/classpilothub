'use server'

import { revalidatePath } from 'next/cache'
import { getUserContext } from '@/lib/supabase/user-context'
import { getAdminClient } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'
import { cleanListingInput } from '@/lib/listing'

export type ListingResult = { ok: boolean; message: string; id?: string }

async function allowedUser() {
  const context = await getUserContext()
  if (!context || !hasPermission(context, 'listing')) return null
  return context
}

const tableHint = (message: string) => (/public_listings|listing_enquiries|schema cache/i.test(message) ? ' Have you run docs/public-listings.sql in Supabase?' : '')

// Saves all the details of the public page.
export async function saveListing(raw: Record<string, unknown>): Promise<ListingResult> {
  const context = await allowedUser()
  if (!context) return { ok: false, message: 'You do not have access to the public profile.' }
  const parsed = cleanListingInput(raw)
  if (!parsed.ok) return { ok: false, message: parsed.error }

  const { data, error } = await getAdminClient()
    .from('public_listings')
    .upsert({ ...parsed.value, organization_id: context.organization.id, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
    .select('id')
    .single()
  if (error || !data) return { ok: false, message: `Could not save: ${error?.message ?? 'unknown error'}.${tableHint(error?.message ?? '')}` }

  revalidatePath('/tutors')
  revalidatePath(`/tutors/${data.id}`)
  revalidatePath('/listing')
  return { ok: true, message: 'Saved.', id: data.id as string }
}

// The two quick switches: show in the public list, and availability.
export async function setListingFlags(flags: { is_visible?: boolean; availability?: string }): Promise<ListingResult> {
  const context = await allowedUser()
  if (!context) return { ok: false, message: 'You do not have access to the public profile.' }
  const admin = getAdminClient()

  const { data: row, error } = await admin.from('public_listings').select('*').eq('organization_id', context.organization.id).maybeSingle()
  if (error) return { ok: false, message: `Could not read your profile: ${error.message}.${tableHint(error.message)}` }
  if (!row) return { ok: false, message: 'Save your details first, then you can switch the listing on.' }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof flags.is_visible === 'boolean') {
    if (flags.is_visible) {
      const contactable = (row.show_phone && (row.phone || row.whatsapp)) || (row.show_email && row.email)
      if (!row.display_name || !row.city) return { ok: false, message: 'Add your name and city before showing your profile.' }
      if (!contactable) return { ok: false, message: 'Add a phone number or email and tick "show on public page", so students can reach you.' }
    }
    update.is_visible = flags.is_visible
  }
  if (flags.availability !== undefined) {
    if (!['available', 'limited', 'full'].includes(flags.availability)) return { ok: false, message: 'Invalid availability.' }
    update.availability = flags.availability
  }

  const { error: updateError } = await admin.from('public_listings').update(update).eq('id', row.id)
  if (updateError) return { ok: false, message: `Could not save: ${updateError.message}` }
  revalidatePath('/tutors')
  revalidatePath(`/tutors/${row.id}`)
  return { ok: true, message: typeof flags.is_visible === 'boolean' ? (flags.is_visible ? 'You are now shown in the public list.' : 'You are hidden from the public list.') : 'Availability updated.' }
}

export async function setEnquiryStatus(id: string, status: string): Promise<ListingResult> {
  const context = await allowedUser()
  if (!context) return { ok: false, message: 'You do not have access to the public profile.' }
  if (!['new', 'contacted', 'closed'].includes(status) || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: 'Invalid request.' }
  const { error } = await getAdminClient().from('listing_enquiries').update({ status }).eq('id', id).eq('organization_id', context.organization.id)
  if (error) return { ok: false, message: `Could not update: ${error.message}` }
  revalidatePath('/listing')
  return { ok: true, message: 'Updated.' }
}
