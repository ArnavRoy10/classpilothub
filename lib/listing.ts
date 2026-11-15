// Shared by the owner's editor and the public pages. No secrets in here.

export const LISTING_TYPES = [
  { value: 'home_tutor', label: 'Home tutor', hint: 'Teaches students at their home' },
  { value: 'teacher', label: 'Individual teacher', hint: 'Teaches from their own place or online' },
  { value: 'coaching_center', label: 'Coaching center', hint: 'An institute with batches and teachers' },
] as const

export const TEACHING_MODES = [
  { value: 'in_person', label: 'In person' },
  { value: 'online', label: 'Online' },
  { value: 'both', label: 'Online & in person' },
] as const

export const FEE_PERIODS = [
  { value: 'hour', label: 'per hour' },
  { value: 'month', label: 'per month' },
  { value: 'course', label: 'per course' },
] as const

export const AVAILABILITY = [
  { value: 'available', label: 'Taking students' },
  { value: 'limited', label: 'Few seats left' },
  { value: 'full', label: 'Full right now' },
] as const

export type ListingType = (typeof LISTING_TYPES)[number]['value']
export type TeachingMode = (typeof TEACHING_MODES)[number]['value']
export type FeePeriod = (typeof FEE_PERIODS)[number]['value']
export type Availability = (typeof AVAILABILITY)[number]['value']

// Every column of a listing (what the owner can see and edit).
export type Listing = {
  id: string
  organization_id: string
  listing_type: ListingType
  display_name: string
  tagline: string | null
  about: string | null
  subjects: string[]
  classes: string | null
  city: string | null
  area: string | null
  address: string | null
  pincode: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  show_phone: boolean
  show_address: boolean
  show_email: boolean
  teaching_mode: TeachingMode
  fee_from: number | null
  fee_to: number | null
  fee_period: FeePeriod
  experience_years: number | null
  seats_open: number | null
  availability: Availability
  is_visible: boolean
  updated_at: string
}

// What visitors may see. Contact details the owner did not tick are removed here, on the server.
export type PublicListing = {
  id: string
  listing_type: ListingType
  display_name: string
  tagline: string | null
  about: string | null
  subjects: string[]
  classes: string | null
  city: string | null
  area: string | null
  address: string | null
  pincode: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  teaching_mode: TeachingMode
  fee_from: number | null
  fee_to: number | null
  fee_period: FeePeriod
  experience_years: number | null
  seats_open: number | null
  availability: Availability
}

export const PUBLIC_COLUMNS =
  'id, listing_type, display_name, tagline, about, subjects, classes, city, area, address, pincode, phone, whatsapp, email, website, show_phone, show_address, show_email, teaching_mode, fee_from, fee_to, fee_period, experience_years, seats_open, availability, updated_at'

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const whole = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

export function toPublic(row: Record<string, unknown>): PublicListing {
  const showPhone = row.show_phone === true
  const showAddress = row.show_address === true
  return {
    id: String(row.id ?? ''),
    listing_type: oneOf(row.listing_type, LISTING_TYPES.map((item) => item.value), 'coaching_center'),
    display_name: String(row.display_name ?? ''),
    tagline: text(row.tagline),
    about: text(row.about),
    subjects: Array.isArray(row.subjects) ? row.subjects.filter((item): item is string => typeof item === 'string') : [],
    classes: text(row.classes),
    city: text(row.city),
    area: text(row.area),
    address: showAddress ? text(row.address) : null,
    pincode: showAddress ? text(row.pincode) : null,
    phone: showPhone ? text(row.phone) : null,
    whatsapp: showPhone ? text(row.whatsapp) : null,
    email: row.show_email === true ? text(row.email) : null,
    website: text(row.website),
    teaching_mode: oneOf(row.teaching_mode, TEACHING_MODES.map((item) => item.value), 'in_person'),
    fee_from: whole(row.fee_from),
    fee_to: whole(row.fee_to),
    fee_period: oneOf(row.fee_period, FEE_PERIODS.map((item) => item.value), 'month'),
    experience_years: whole(row.experience_years),
    seats_open: whole(row.seats_open),
    availability: oneOf(row.availability, AVAILABILITY.map((item) => item.value), 'available'),
  }
}

// ---------------- helpers ----------------

export function typeLabel(type: ListingType) {
  return LISTING_TYPES.find((item) => item.value === type)?.label ?? 'Tutor'
}
export function modeLabel(mode: TeachingMode) {
  return TEACHING_MODES.find((item) => item.value === mode)?.label ?? ''
}
export function availabilityLabel(value: Availability) {
  return AVAILABILITY.find((item) => item.value === value)?.label ?? ''
}
export function feeText(listing: Pick<PublicListing, 'fee_from' | 'fee_to' | 'fee_period'>) {
  const { fee_from: from, fee_to: to } = listing
  if (from === null && to === null) return null
  const period = FEE_PERIODS.find((item) => item.value === listing.fee_period)?.label ?? ''
  const money = (value: number) => `₹${value.toLocaleString('en-IN')}`
  if (from !== null && to !== null && from !== to) return `${money(from)} – ${money(to)} ${period}`
  return `${money((from ?? to) as number)} ${period}`
}
export function initialsOf(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'
}

// "98765 43210" or "+91 98765-43210" -> "9876543210" / "+919876543210". Rejects anything that is not 7 to 15 digits.
export function phoneOf(value: string): { value: string | null; invalid: boolean } {
  const cleaned = value.replace(/[\s\-().]/g, '')
  if (!cleaned) return { value: null, invalid: false }
  const digits = cleaned.replace(/^\+/, '')
  if (!/^\d{7,15}$/.test(digits)) return { value: null, invalid: true }
  return { value: cleaned.startsWith('+') ? `+${digits}` : digits, invalid: false }
}

type Cleaned = { ok: true; value: Record<string, unknown> } | { ok: false; error: string }

// Checks and tidies what the owner typed. Used on the server before anything is saved.
export function cleanListingInput(raw: Record<string, unknown>): Cleaned {
  const str = (key: string, max: number) => String(raw[key] ?? '').trim().slice(0, max)
  const whole = (key: string, label: string, min: number, max: number): { value: number | null; error?: string } => {
    const value = String(raw[key] ?? '').trim()
    if (!value) return { value: null }
    const number = Number(value)
    if (!Number.isInteger(number) || number < min || number > max) return { value: null, error: `${label} must be a whole number between ${min} and ${max}.` }
    return { value: number }
  }

  const displayName = str('display_name', 80)
  if (displayName.length < 2) return { ok: false, error: 'Enter the name to show on your public page.' }
  const city = str('city', 60)
  if (city.length < 2) return { ok: false, error: 'Enter your city or town.' }

  const phone = phoneOf(str('phone', 24))
  if (phone.invalid) return { ok: false, error: 'The phone number must have 7 to 15 digits.' }
  const whatsapp = phoneOf(str('whatsapp', 24))
  if (whatsapp.invalid) return { ok: false, error: 'The WhatsApp number must have 7 to 15 digits.' }

  const email = str('email', 120).toLowerCase()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' }
  const website = str('website', 200)
  if (website && !/^https?:\/\/\S+$/i.test(website)) return { ok: false, error: 'The website must start with http:// or https://' }

  const subjectsSource = Array.isArray(raw.subjects) ? raw.subjects.join(',') : String(raw.subjects ?? '')
  const subjects = [...new Set(subjectsSource.split(',').map((item) => item.trim().slice(0, 40)).filter(Boolean))].slice(0, 12)

  const feeFrom = whole('fee_from', 'The lowest fee', 0, 1_000_000)
  const feeTo = whole('fee_to', 'The highest fee', 0, 1_000_000)
  const experience = whole('experience_years', 'Years of experience', 0, 60)
  const seats = whole('seats_open', 'Open seats', 0, 10_000)
  const numberError = feeFrom.error ?? feeTo.error ?? experience.error ?? seats.error
  if (numberError) return { ok: false, error: numberError }
  if (feeFrom.value !== null && feeTo.value !== null && feeFrom.value > feeTo.value) return { ok: false, error: 'The lowest fee cannot be higher than the highest fee.' }

  const type = oneOf(raw.listing_type, LISTING_TYPES.map((item) => item.value), 'coaching_center')
  return {
    ok: true,
    value: {
      listing_type: type,
      display_name: displayName,
      tagline: str('tagline', 140) || null,
      about: str('about', 2000) || null,
      subjects,
      classes: str('classes', 100) || null,
      city,
      area: str('area', 80) || null,
      address: str('address', 200) || null,
      pincode: str('pincode', 12) || null,
      phone: phone.value,
      whatsapp: whatsapp.value,
      email: email || null,
      website: website || null,
      show_phone: raw.show_phone === true,
      show_address: raw.show_address === true,
      show_email: raw.show_email === true,
      teaching_mode: oneOf(raw.teaching_mode, TEACHING_MODES.map((item) => item.value), 'in_person'),
      fee_from: feeFrom.value,
      fee_to: feeTo.value,
      fee_period: oneOf(raw.fee_period, FEE_PERIODS.map((item) => item.value), 'month'),
      experience_years: experience.value,
      seats_open: seats.value,
    },
  }
}
