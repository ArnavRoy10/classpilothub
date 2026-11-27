import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/user-context'
import { hasPermission, STAFF_SECTIONS } from '@/lib/permissions'
import { generate, type GeminiAttempt, type GeminiMessage } from '@/lib/gemini'

export const maxDuration = 60

// Read-only AI assistant powered by Google Gemini. It sees a short summary of the signed-in person's
// organisation (only the areas they are allowed to open) and answers questions. It cannot change any data.

const hourly = new Map<string, number[]>()
function limited(userId: string) {
  const now = Date.now()
  const recent = (hourly.get(userId) ?? []).filter((time) => now - time < 3_600_000)
  if (recent.length >= 40) { hourly.set(userId, recent); return true }
  recent.push(now)
  hourly.set(userId, recent)
  return false
}

// The model that last answered, so the next question goes straight to it.
let preferredModel: string | null = null

export async function POST(request: Request) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  if (['student', 'parent'].includes(context.role)) return NextResponse.json({ error: 'The assistant is available to staff.' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'The AI assistant is not set up yet. Add GEMINI_API_KEY to your environment variables.' }, { status: 503 })
  if (limited(context.userId)) return NextResponse.json({ error: 'You have asked a lot of questions. Please try again in a while.' }, { status: 429 })

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null
  const messages: GeminiMessage[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((item): item is GeminiMessage => Boolean(item) && typeof item === 'object' && ['user', 'assistant'].includes((item as GeminiMessage).role) && typeof (item as GeminiMessage).content === 'string')
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 1500) }))
    .filter((item) => item.content.length > 0)
    .slice(-10)
  while (messages.length > 0 && messages[0].role === 'assistant') messages.shift() // Gemini needs the chat to start with the user
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 })

  // ---- summary of the organisation, limited to what this person may see (all queries run together) ----
  const supabase = await createClient()
  const orgId = context.organization.id
  const allowed = (key: string) => hasPermission(context, key)
  const todayStr = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const count = async (table: string) => (await supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)).count ?? 0

  let summary: (string | null)[] = []
  try {
    summary = await Promise.all([
      allowed('students') ? count('students').then((n) => `Students enrolled: ${n}`) : null,
      allowed('teachers') ? count('teachers').then((n) => `Teachers: ${n}`) : null,
      allowed('batches') ? count('batches').then((n) => `Batches: ${n}`) : null,
      allowed('attendance')
        ? Promise.resolve(supabase.from('attendance').select('status').eq('organization_id', orgId).eq('date', todayStr)).then(({ data }) => {
            const total = data?.length ?? 0
            const present = data?.filter((row) => row.status === 'present').length ?? 0
            return total ? `Attendance recorded today: ${present} present of ${total} (${Math.round((present / total) * 100)}%)` : 'Attendance recorded today: none yet'
          })
        : null,
      allowed('fees')
        ? Promise.all([
            supabase.from('student_fees').select('amount').eq('organization_id', orgId).neq('status', 'paid'),
            supabase.from('payments').select('amount, student_fees!inner(organization_id)').eq('student_fees.organization_id', orgId).gte('payment_date', monthStart),
          ]).then(([{ data: pending }, { data: paid }]) =>
            `Pending fee records: ${pending?.length ?? 0}, totalling INR ${(pending ?? []).reduce((sum, fee) => sum + Number(fee.amount), 0).toLocaleString('en-IN')}\nCollected this month: INR ${(paid ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0).toLocaleString('en-IN')}`)
        : null,
      allowed('timetable')
        ? Promise.resolve(supabase.from('schedules').select('*').eq('organization_id', orgId)).then(({ data }) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            const today = days[new Date().getDay()]
            const rows = (data ?? []).filter((slot: Record<string, unknown>) => slot.day_of_week === today || slot.day_of_week === new Date().getDay())
            return rows.length
              ? `Classes today: ${rows.map((slot: Record<string, unknown>) => `${String(slot.start_time ?? '').slice(0, 5)} ${String(slot.subject ?? 'Class')}`).join('; ')}`
              : 'Classes today: none scheduled'
          })
        : null,
    ])
  } catch (error) {
    console.error('[assistant] could not read the summary', error)
  }
  const lines = summary.filter((line): line is string => Boolean(line))

  const pages = STAFF_SECTIONS.filter((section) => allowed(section.key)).map((section) => `${section.label} (${section.href})`).join(', ')
  const system = [
    `You are the ClassPilotHub Assistant inside the dashboard of "${context.organization.name}", talking to ${context.fullName} (role: ${context.role}).`,
    'ClassPilotHub is software for tutors and coaching centers: students, teachers, batches, attendance, tests, results, timetable, fees, announcements, communications and reports.',
    `Today is ${todayStr}. Currency is Indian rupees.`,
    'You can only read the summary below and answer questions. You cannot add, change or delete anything; for changes, tell the person which page to open and what to click.',
    'Never invent numbers or names. If the summary does not contain the answer, say so and point to the page where it can be found.',
    'Keep answers short and friendly (under 120 words unless asked for more), in the same language the person writes in. Plain text only, no markdown headings.',
    `Pages this person can open: Dashboard (/dashboard), ${pages || 'none besides Dashboard'}, Settings (/settings), Support (/support).`,
    '',
    'Summary of the organisation right now:',
    ...(lines.length ? lines : ['(nothing available for this person\'s permissions)']),
  ].join('\n')

  // Try up to three fast models, each for a short time, so one slow or missing model never blocks the chat.
  const candidates = [...new Set([preferredModel, process.env.GEMINI_MODEL, 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest'].filter((name): name is string => Boolean(name)))].slice(0, 3)
  const attempts: GeminiAttempt[] = []

  for (const model of candidates) {
    const attempt = await generate({ apiKey, model, system, messages, timeoutMs: 17_000, maxOutputTokens: 800 })
    if (attempt.ok && attempt.text) {
      preferredModel = model
      return NextResponse.json({ reply: attempt.text })
    }
    attempts.push(attempt)
    console.error('[assistant] model failed', model, attempt.status ?? '', attempt.error)
    if (attempt.status === 401 || attempt.status === 403) break // the key itself is the problem: other models will not help
  }

  const keyProblem = attempts.some((attempt) => attempt.status === 401 || attempt.status === 403 || (attempt.status === 400 && /api key/i.test(attempt.error ?? '')))
  const busy = attempts.every((attempt) => attempt.status === 429)
  const detail = attempts.map((attempt) => `${attempt.model}: ${attempt.error ?? 'failed'}`).join(' | ')
  const message = keyProblem ? 'The AI key was rejected. Check GEMINI_API_KEY, and that the Gemini API is allowed for that key.'
    : busy ? 'The AI is busy right now (usage limit reached). Please try again in a minute.'
    : `The assistant could not get an answer from Google. ${detail}`
  return NextResponse.json({ error: message.slice(0, 400) }, { status: 502 })
}
