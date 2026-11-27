import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getAdminClient } from '@/lib/supabase/admin'
import { getOrganizationBillingState } from '@/lib/billing-gate'
import { createFeePaymentLink, razorpay } from '@/lib/razorpay'
import { SITE_URL, SITE_NAME } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Admin = ReturnType<typeof getAdminClient>
type FeeRow = {
  id: string
  organization_id: string
  student_id: string
  amount: number | string
  due_date: string
  status: string
  razorpay_payment_link_url?: string | null
}
type OutgoingEmail = { from: string; to: string; subject: string; text: string }
type LogRow = { organization_id: string; student_fee_id: string; kind: string; recipient: string }
type Candidate = {
  fee: FeeRow
  kind: string
  diff: number
  due: string
  remaining: number
  partlyPaid: boolean
  email: string
  name: string
  org: string
  payUrl: string | null
}

const DAY_MS = 86_400_000

// Days relative to the due date -> reminder stage. Negative = before the due date, positive = overdue.
const REMINDER_DAYS: Record<number, string> = { [-3]: 'before-3', 0: 'due-today', 3: 'late-3', 7: 'late-7' }

// "Today" in India (IST = UTC+5:30), as YYYY-MM-DD, because the cron itself runs in UTC.
function todayInIndia() {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10)
}
function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}
function daysBetween(later: string, earlier: string) {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / DAY_MS)
}
const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`

// Supabase limits how long a query can be, so long id lists are fetched 100 at a time.
async function selectIn<T>(admin: Admin, table: string, columns: string, column: string, ids: string[]): Promise<T[]> {
  const rows: T[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await admin.from(table).select(columns).in(column, ids.slice(i, i + 100))
    if (data) rows.push(...(data as unknown as T[]))
  }
  return rows
}

// Sends in batches of 100. Returns the positions (in the given list) that were accepted by the email provider.
async function sendAll(resend: Resend, emails: OutgoingEmail[]) {
  const sent = new Set<number>()
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100)
    const { error } = await resend.batch.send(chunk)
    if (error) {
      console.error('Fee reminder batch failed:', error.message)
      continue
    }
    for (let j = 0; j < chunk.length; j++) sent.add(i + j)
  }
  return sent
}

// Gets (or creates) the Razorpay payment link for a fee. Returns null if one cannot be made.
async function ensurePayLink(admin: Admin, candidate: Candidate): Promise<string | null> {
  const { fee } = candidate
  // A saved link has the full amount in it, so it is only reused when nothing has been paid yet.
  if (fee.razorpay_payment_link_url && !candidate.partlyPaid) return fee.razorpay_payment_link_url
  if (!razorpay) return fee.razorpay_payment_link_url ?? null
  try {
    const link = await createFeePaymentLink({
      amount: candidate.remaining,
      studentFeeId: fee.id,
      organizationId: fee.organization_id,
      description: `Fee payment for ${candidate.name}`,
      customerName: candidate.name,
    })
    await admin.from('student_fees').update({ razorpay_payment_link_id: link.id, razorpay_payment_link_url: link.short_url }).eq('id', fee.id)
    return link.short_url as string
  } catch (error) {
    console.error('Could not create a payment link for fee', fee.id, error instanceof Error ? error.message : error)
    return fee.razorpay_payment_link_url ?? null
  }
}

// GET /api/cron/fee-reminders            -> sends today's reminders (Vercel calls this every morning)
// GET /api/cron/fee-reminders?dryRun=1   -> shows what would be sent, sends nothing, creates no links
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set.' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey && !dryRun) return NextResponse.json({ error: 'Email delivery is not configured (RESEND_API_KEY).' }, { status: 503 })
  const resend = apiKey ? new Resend(apiKey) : null
  const from = `${SITE_NAME} <${process.env.RESEND_EMAIL_DOMAIN ? `no-reply@${process.env.RESEND_EMAIL_DOMAIN}` : 'onboarding@resend.dev'}>`

  const admin = getAdminClient()
  const today = todayInIndia()

  // 1. Every unpaid invoice that is overdue or due within the next 3 days.
  const { data: feeData, error: feeError } = await admin
    .from('student_fees')
    .select('id, organization_id, student_id, amount, due_date, status, razorpay_payment_link_url')
    .neq('status', 'paid')
    .lte('due_date', addDays(today, 3))
    .order('due_date', { ascending: true })
    .limit(2000)
  if (feeError) return NextResponse.json({ error: feeError.message }, { status: 500 })
  const fees = (feeData ?? []) as unknown as FeeRow[]
  if (!fees.length) return NextResponse.json({ date: today, studentEmails: 0, ownerEmails: 0, note: 'No unpaid invoices are due soon.' })

  const feeIds = fees.map((fee) => fee.id)
  const orgIds = [...new Set(fees.map((fee) => fee.organization_id))]
  const studentIds = [...new Set(fees.map((fee) => fee.student_id))]

  // 2. Organisations (skip the ones suspended for non-payment).
  const orgs = await selectIn<{ id: string; name?: string | null; plan?: string | null }>(admin, 'organizations', '*', 'id', orgIds)
  const orgName = new Map(orgs.map((org) => [org.id, org.name || SITE_NAME]))
  const suspendedOrgs = new Set<string>()
  for (const org of orgs) {
    try {
      const state = await getOrganizationBillingState(org.id, org.plan)
      if (state.kind === 'suspended') suspendedOrgs.add(org.id)
    } catch (error) {
      console.error('Billing state check failed for', org.id, error)
    }
  }

  // 3. What was already sent, what was already paid, and who to write to.
  const logs = await selectIn<{ student_fee_id: string; kind: string }>(admin, 'fee_reminder_log', 'student_fee_id, kind', 'student_fee_id', feeIds)
  const alreadySent = new Set(logs.map((log) => `${log.student_fee_id}:${log.kind}`))

  const payments = await selectIn<{ student_fee_id: string; amount: number | string }>(admin, 'payments', 'student_fee_id, amount', 'student_fee_id', feeIds)
  const paidSoFar = new Map<string, number>()
  for (const payment of payments) paidSoFar.set(payment.student_fee_id, (paidSoFar.get(payment.student_fee_id) ?? 0) + Number(payment.amount))
  const remainingOf = (fee: FeeRow) => Math.max(Number(fee.amount) - (paidSoFar.get(fee.id) ?? 0), 0)

  const students = await selectIn<{ id: string; full_name: string }>(admin, 'students', 'id, full_name', 'id', studentIds)
  const studentName = new Map(students.map((student) => [student.id, student.full_name]))
  const studentLogins = await selectIn<{ student_id: string; email: string | null }>(admin, 'profiles', 'student_id, email', 'student_id', studentIds)
  const studentEmail = new Map(studentLogins.filter((login) => login.email).map((login) => [login.student_id, login.email as string]))

  // 3a. Work out which students get a reminder today.
  const candidates: Candidate[] = []
  let skippedNoEmail = 0
  for (const fee of fees) {
    if (suspendedOrgs.has(fee.organization_id)) continue
    const due = String(fee.due_date).slice(0, 10)
    const diff = daysBetween(today, due)
    const kind = REMINDER_DAYS[diff]
    if (!kind || alreadySent.has(`${fee.id}:${kind}`)) continue
    const remaining = remainingOf(fee)
    if (remaining <= 0) continue
    const email = studentEmail.get(fee.student_id)
    if (!email) { skippedNoEmail++; continue }
    candidates.push({
      fee, kind, diff, due, remaining,
      partlyPaid: (paidSoFar.get(fee.id) ?? 0) > 0,
      email,
      name: studentName.get(fee.student_id) ?? 'Student',
      org: orgName.get(fee.organization_id) ?? SITE_NAME,
      payUrl: fee.razorpay_payment_link_url ?? null,
    })
  }

  // 3b. Get a payment link for each one (10 at a time). A dry run creates nothing.
  if (!dryRun) {
    for (let i = 0; i < candidates.length; i += 10) {
      const group = candidates.slice(i, i + 10)
      const urls = await Promise.all(group.map((candidate) => ensurePayLink(admin, candidate)))
      group.forEach((candidate, index) => { candidate.payUrl = urls[index] })
    }
  }

  // 4. Reminder emails for students.
  const studentMails: OutgoingEmail[] = []
  const logRows: LogRow[] = []
  for (const c of candidates) {
    const when = c.diff < 0 ? `is due in ${-c.diff} day${-c.diff === 1 ? '' : 's'} (${c.due})` : c.diff === 0 ? `is due today (${c.due})` : `was due on ${c.due} and is now ${c.diff} days overdue`
    const payLines = c.payUrl
      ? `Pay now (opens Google Pay, PhonePe, Paytm or any UPI app on your phone):\n${c.payUrl}\n\nYour balance and payment history: ${SITE_URL}/portal/fees`
      : `You can see your balance and payment history here: ${SITE_URL}/portal/fees`
    studentMails.push({
      from,
      to: c.email,
      subject: c.diff > 0 ? `Fee overdue: ${rupees(c.remaining)}` : `Fee reminder: ${rupees(c.remaining)} ${c.diff === 0 ? 'due today' : 'due soon'}`,
      text: `Hi ${c.name},\n\nThis is a reminder from ${c.org}: your fee of ${rupees(c.remaining)} ${when}.\n\n${payLines}\n\nIf you have already paid, please ignore this message.\n\n${c.org}`,
    })
    logRows.push({ organization_id: c.fee.organization_id, student_fee_id: c.fee.id, kind: c.kind, recipient: c.email })
  }

  // 5. One daily summary for each owner.
  const ownerEmailsByOrg = new Map<string, string[]>()
  const { data: ownerRows } = await admin.from('profiles').select('organization_id, email').eq('role', 'owner').in('organization_id', orgIds)
  for (const owner of (ownerRows ?? []) as { organization_id: string; email: string | null }[]) {
    if (!owner.email) continue
    ownerEmailsByOrg.set(owner.organization_id, [...(ownerEmailsByOrg.get(owner.organization_id) ?? []), owner.email])
  }

  const ownerMails: OutgoingEmail[] = []
  for (const orgId of orgIds) {
    if (suspendedOrgs.has(orgId)) continue
    const recipients = ownerEmailsByOrg.get(orgId) ?? []
    if (!recipients.length) continue
    const orgFees = fees.filter((fee) => fee.organization_id === orgId && remainingOf(fee) > 0)
    const overdue = orgFees.filter((fee) => String(fee.due_date).slice(0, 10) < today)
    const dueToday = orgFees.filter((fee) => String(fee.due_date).slice(0, 10) === today)
    if (!overdue.length && !dueToday.length) continue

    const line = (fee: FeeRow) => {
      const due = String(fee.due_date).slice(0, 10)
      const late = daysBetween(today, due)
      return `- ${studentName.get(fee.student_id) ?? 'Student'}: ${rupees(remainingOf(fee))}, due ${due}${late > 0 ? ` (${late} days overdue)` : ''}`
    }
    const total = (rows: FeeRow[]) => rows.reduce((sum, fee) => sum + remainingOf(fee), 0)
    const org = orgName.get(orgId) ?? SITE_NAME
    const text = [
      `Fee summary for ${org} (${today})`,
      '',
      `Overdue: ${overdue.length} invoice${overdue.length === 1 ? '' : 's'}, ${rupees(total(overdue))} in total`,
      ...overdue.slice(0, 15).map(line),
      overdue.length > 15 ? `...and ${overdue.length - 15} more. Open the Fees page to see all of them.` : '',
      '',
      `Due today: ${dueToday.length} invoice${dueToday.length === 1 ? '' : 's'}, ${rupees(total(dueToday))} in total`,
      ...dueToday.slice(0, 15).map(line),
      '',
      `Open the Fees page to send a payment link or QR code: ${SITE_URL}/fees`,
    ].filter((row, index, all) => row !== '' || all[index - 1] !== '').join('\n')
    for (const to of recipients) ownerMails.push({ from, to, subject: `Fee summary: ${overdue.length} overdue, ${dueToday.length} due today`, text })
  }

  if (dryRun || !resend) {
    return NextResponse.json({
      dryRun: true, date: today, studentEmails: studentMails.length, ownerEmails: ownerMails.length, skippedNoEmail,
      razorpayConfigured: Boolean(razorpay),
      studentPreview: candidates.slice(0, 5).map((c) => ({ to: c.email, remaining: c.remaining, stage: c.kind, hasSavedPayLink: Boolean(c.payUrl) })),
      ownerPreview: ownerMails.slice(0, 5).map((mail) => ({ to: mail.to, subject: mail.subject })),
    })
  }

  // 6. Send, then remember which student reminders went out so they are never repeated.
  const sentStudents = await sendAll(resend, studentMails)
  const sentLogRows = logRows.filter((_, index) => sentStudents.has(index))
  if (sentLogRows.length) {
    const { error } = await admin.from('fee_reminder_log').upsert(sentLogRows, { onConflict: 'student_fee_id,kind', ignoreDuplicates: true })
    if (error) console.error('Could not save the reminder log (did you run the SQL?):', error.message)
  }
  const sentOwners = await sendAll(resend, ownerMails)

  return NextResponse.json({
    date: today,
    studentEmails: sentStudents.size,
    ownerEmails: sentOwners.size,
    skippedNoEmail,
    withPayLink: candidates.filter((c) => c.payUrl).length,
  })
}
