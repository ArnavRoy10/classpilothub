import { NextResponse } from 'next/server'
import { requireFounderAdmin } from '@/lib/founder-admin'
import { generate } from '@/lib/gemini'

export const maxDuration = 60

// Founder-only check of the Gemini connection: lists the models the key can use and times a tiny question on each.
export async function GET() {
  const founder = await requireFounderAdmin()
  if (!founder) return NextResponse.json({ error: 'Founders only.' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ keySet: false, hint: 'Add GEMINI_API_KEY in Vercel and redeploy.' })

  // 1. Which models does this key see?
  let available: string[] = []
  let listError: string | null = null
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!response.ok) listError = `HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 200)}`
    else {
      const data = (await response.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }
      available = (data.models ?? []).filter((model) => model.supportedGenerationMethods?.includes('generateContent')).map((model) => model.name.replace('models/', ''))
    }
  } catch (error) {
    listError = error instanceof Error ? error.message : 'unknown error'
  }

  // 2. Time a tiny question on a few likely models.
  const stable = (name: string) => !/preview|exp|image|tts|live|audio|thinking|robotics|computer/i.test(name)
  const candidates = [...new Set([
    process.env.GEMINI_MODEL,
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    available.find((name) => /flash-lite/.test(name) && stable(name)),
    available.find((name) => /flash/.test(name) && !/lite/.test(name) && stable(name)),
  ].filter((name): name is string => Boolean(name)))].slice(0, 4)

  const tests = await Promise.all(candidates.map((model) =>
    generate({ apiKey, model, messages: [{ role: 'user', content: 'Reply with the single word OK.' }], timeoutMs: 20_000, maxOutputTokens: 20 }),
  ))

  return NextResponse.json({
    keySet: true,
    serverRegion: process.env.VERCEL_REGION ?? 'unknown',
    configuredModel: process.env.GEMINI_MODEL ?? '(not set: automatic)',
    listError,
    modelsAvailableForYourKey: available.slice(0, 60),
    tests: tests.map((test) => ({ model: test.model, ok: test.ok, seconds: Math.round(test.ms / 100) / 10, answer: test.text?.slice(0, 40), error: test.error })),
  }, { headers: { 'cache-control': 'no-store' } })
}
