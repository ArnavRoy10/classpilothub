import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/user-context'
import { hasPermission, STAFF_SECTIONS } from '@/lib/permissions'

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

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
}

// Models that "think" before answering can be slow. Where the model is known, ask it to think as little as possible.
function thinkingConfigFor(model: string) {
  if (/gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 }
  if (/gemini-3/.test(model)) return { thinkingLevel: 'low' }
  return null
}

export async function POST(request: Request) {
  const context = await getUserContext()
  if (!context) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  if (['student', 'parent'].includes(context.role)) return NextResponse.json({ error: 'The assistant is available to staff.' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'The AI assistant is not set up yet. Add GEMINI_API_KEY to your environment variables.' }, { status: 503 })
  if (limited(context.userId)) return NextResponse.json({ error: 'You have asked a lot of questions. Please try again in a while.' }, { status: 429 })

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null
  const messages: ChatMessage[] = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((item): item is ChatMessage => Boolean(item) && typeof item === 'object' && ['user', 'assistant'].includes((item as ChatMessage).role) && typeof (item as ChatMessage).content === 'string')
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
    `You are the ClassPilot Assistant inside the dashboard of "${context.organization.name}", talking to ${context.fullName} (role: ${context.role}).`,
    'ClassPilot is software for tutors and coaching centers: students, teachers, batches, attendance, tests, results, timetable, fees, announcements, communications and reports.',
    `Today is ${todayStr}. Currency is Indian rupees.`,
    'You can only read the summary below and answer questions. You cannot add, change or delete anything; for changes, tell the person which page to open and what to click.',
    'Never invent numbers or names. If the summary does not contain the answer, say so and point to the page where it can be found.',
    'Keep answers short and friendly (under 120 words unless asked for more), in the same language the person writes in. Plain text only, no markdown headings.',
    `Pages this person can open: Dashboard (/dashboard), ${pages || 'none besides Dashboard'}, Settings (/settings), Support (/support).`,
    '',
    'Summary of the organisation right now:',
    ...(lines.length ? lines : ['(nothing available for this person\'s permissions)']),
  ].join('\n')

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const thinking = thinkingConfigFor(model)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50_000)

  const callGemini = (useThinking: boolean) =>
    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4, ...(useThinking && thinking ? { thinkingConfig: thinking } : {}) },
      }),
      signal: controller.signal,
    })

  try {
    let response = await callGemini(true)
    if (response.status === 400 && thinking) {
      // The model did not accept the "think less" setting: try again without it.
      const detail = await response.clone().text().catch(() => '')
      if (/think/i.test(detail)) response = await callGemini(false)
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      console.error('[assistant] Gemini API error', response.status, detail)
      let reason = ''
      try { reason = (JSON.parse(detail) as { error?: { message?: string } }).error?.message ?? '' } catch { /* not JSON */ }
      const message =
        response.status === 429 ? 'The AI is busy right now (usage limit reached). Please try again in a minute.'
        : response.status === 404 ? `The AI model "${model}" was not found. Set GEMINI_MODEL to a model from Google AI Studio.`
        : response.status === 400 && /api key/i.test(detail) ? 'The AI key is not valid. Check GEMINI_API_KEY.'
        : response.status === 401 || response.status === 403 ? 'The AI key was rejected. Check GEMINI_API_KEY and that the Gemini API is enabled for it.'
        : `The assistant could not answer (Google error ${response.status}${reason ? `: ${reason.slice(0, 160)}` : ''}).`
      return NextResponse.json({ error: message }, { status: 502 })
    }

    const data = (await response.json()) as GeminiResponse
    const reply = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('').trim()
    if (!reply) {
      const blocked = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason === 'SAFETY'
      const reason = data.candidates?.[0]?.finishReason
      return NextResponse.json({ error: blocked ? 'The assistant could not answer that. Try rephrasing your question.' : `The assistant returned an empty answer${reason ? ` (${reason})` : ''}. Please try again.` }, { status: 502 })
    }
    return NextResponse.json({ reply })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    console.error('[assistant] request failed', timedOut ? 'timeout after 50s' : error)
    return NextResponse.json({
      error: timedOut
        ? 'The assistant took too long. Try again, or set GEMINI_MODEL to a faster model (for example a "flash-lite" model).'
        : `The assistant could not reach Google Gemini: ${error instanceof Error ? error.message : 'unknown error'}`,
    }, { status: 504 })
  } finally {
    clearTimeout(timer)
  }
}
