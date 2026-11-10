import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/supabase/user-context'
import { hasPermission, STAFF_SECTIONS } from '@/lib/permissions'

export const maxDuration = 30

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

  // ---- summary of the organisation, limited to what this person may see -------------------
  const supabase = await createClient()
  const orgId = context.organization.id
  const allowed = (key: string) => hasPermission(context, key)
  const todayStr = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const lines: string[] = []

  const count = async (table: string) => (await supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)).count ?? 0
  if (allowed('students')) lines.push(`Students enrolled: ${await count('students')}`)
  if (allowed('teachers')) lines.push(`Teachers: ${await count('teachers')}`)
  if (allowed('batches')) lines.push(`Batches: ${await count('batches')}`)
  if (allowed('attendance')) {
    const { data } = await supabase.from('attendance').select('status').eq('organization_id', orgId).eq('date', todayStr)
    const total = data?.length ?? 0
    const present = data?.filter((row) => row.status === 'present').length ?? 0
    lines.push(total ? `Attendance recorded today: ${present} present of ${total} (${Math.round((present / total) * 100)}%)` : 'Attendance recorded today: none yet')
  }
  if (allowed('fees')) {
    const [{ data: pending }, { data: paid }] = await Promise.all([
      supabase.from('student_fees').select('amount').eq('organization_id', orgId).neq('status', 'paid'),
      supabase.from('payments').select('amount, student_fees!inner(organization_id)').eq('student_fees.organization_id', orgId).gte('payment_date', monthStart),
    ])
    lines.push(`Pending fee records: ${pending?.length ?? 0}, totalling INR ${(pending ?? []).reduce((sum, fee) => sum + Number(fee.amount), 0).toLocaleString('en-IN')}`)
    lines.push(`Collected this month: INR ${(paid ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0).toLocaleString('en-IN')}`)
  }
  if (allowed('timetable')) {
    const { data } = await supabase.from('schedules').select('start_time, subject, room, batches(name)').eq('organization_id', orgId).eq('day_of_week', new Date().getDay()).order('start_time')
    lines.push(data?.length ? `Classes today: ${data.map((slot) => `${String(slot.start_time).slice(0, 5)} ${slot.subject ?? 'Class'}${Array.isArray(slot.batches) ? (slot.batches[0] ? ` (${slot.batches[0].name})` : '') : slot.batches ? ` (${(slot.batches as { name: string }).name})` : ''}`).join('; ')}` : 'Classes today: none scheduled')
  }

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
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
        generationConfig: { maxOutputTokens: 1500, temperature: 0.4 },
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300)
      console.error('[assistant] Gemini API error', response.status, detail)
      const message =
        response.status === 429 ? 'The AI is busy right now (usage limit reached). Please try again in a minute.'
        : response.status === 404 ? `The AI model "${model}" was not found. Set GEMINI_MODEL to a model from Google AI Studio.`
        : response.status === 400 && detail.toLowerCase().includes('api key') ? 'The AI key is not valid. Check GEMINI_API_KEY.'
        : response.status === 401 || response.status === 403 ? 'The AI key was rejected. Check GEMINI_API_KEY.'
        : 'The assistant could not answer right now. Please try again.'
      return NextResponse.json({ error: message }, { status: 502 })
    }

    const data = (await response.json()) as GeminiResponse
    const reply = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('').trim()
    if (!reply) {
      const blocked = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason === 'SAFETY'
      return NextResponse.json({ error: blocked ? 'The assistant could not answer that. Try rephrasing your question.' : 'The assistant returned an empty answer. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: 'The assistant took too long. Please try again.' }, { status: 504 })
  } finally {
    clearTimeout(timer)
  }
}
