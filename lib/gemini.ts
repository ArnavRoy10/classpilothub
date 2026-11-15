import 'server-only'

export type GeminiMessage = { role: 'user' | 'assistant'; content: string }
export type GeminiAttempt = { model: string; ok: boolean; ms: number; text?: string; status?: number; error?: string; timedOut?: boolean }

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
}

// Models that "think" before answering can be slow. Where the model is known, ask it to think as little as possible.
function thinkingConfigFor(model: string) {
  if (/gemini-2\.5-flash(?!-lite)/.test(model)) return { thinkingBudget: 0 }
  if (/gemini-3/.test(model)) return { thinkingLevel: 'low' }
  return null
}

// One request to one Gemini model, with its own time limit. Never throws.
export async function generate(options: {
  apiKey: string
  model: string
  system?: string
  messages: GeminiMessage[]
  timeoutMs: number
  maxOutputTokens?: number
}): Promise<GeminiAttempt> {
  const started = Date.now()
  const finish = (result: Omit<GeminiAttempt, 'model' | 'ms'>): GeminiAttempt => ({ model: options.model, ms: Date.now() - started, ...result })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent`
  const thinking = thinkingConfigFor(options.model)

  const call = (withThinking: boolean) =>
    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': options.apiKey },
      body: JSON.stringify({
        ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
        contents: options.messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
        generationConfig: { maxOutputTokens: options.maxOutputTokens ?? 800, temperature: 0.4, ...(withThinking && thinking ? { thinkingConfig: thinking } : {}) },
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

  try {
    let response = await call(true)
    if (response.status === 400 && thinking) {
      // The model did not accept the "think less" setting: try again without it.
      const detail = await response.clone().text().catch(() => '')
      if (/think/i.test(detail)) response = await call(false)
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 400)
      let reason = ''
      try { reason = (JSON.parse(detail) as { error?: { message?: string } }).error?.message ?? '' } catch { /* not JSON */ }
      return finish({ ok: false, status: response.status, error: (reason || detail || `HTTP ${response.status}`).slice(0, 200) })
    }

    const data = (await response.json()) as GeminiResponse
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('').trim()
    if (!text) {
      const blocked = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason === 'SAFETY'
      return finish({ ok: false, status: 200, error: blocked ? 'The answer was blocked by Google safety filters.' : `Empty answer (${data.candidates?.[0]?.finishReason ?? 'no reason given'}).` })
    }
    return finish({ ok: true, text })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return finish({ ok: false, timedOut, error: timedOut ? `no answer within ${Math.round(options.timeoutMs / 1000)} seconds` : error instanceof Error ? error.message : 'unknown error' })
  } finally {
    clearTimeout(timer)
  }
}
