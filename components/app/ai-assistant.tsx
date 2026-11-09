'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'

type Message = { role: 'user' | 'assistant'; content: string }

const TIPS = ['Summarise my day', 'How are fees doing?', 'How do I add a batch?']

// Chat assistant that knows a summary of this organisation (counts, today's attendance, fees, classes)
// and how ClassPilot works. It only answers questions: it cannot change any data.
export function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [messages, busy])

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    const next: Message[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next }) })
      const result = (await response.json().catch(() => ({}))) as { reply?: string; error?: string }
      if (!response.ok || !result.reply) throw new Error(result.error ?? 'The assistant could not answer right now.')
      setMessages([...next, { role: 'assistant', content: result.reply }])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The assistant could not answer right now.')
      setMessages(next.slice(0, -1))
      setInput(content)
    }
    setBusy(false)
  }

  return (
    <Card className="min-h-[420px]">
      <div className="flex items-center justify-between px-(--card-spacing)">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold"><Sparkles className="size-4 text-neon" aria-hidden="true" />AI Assistant</h2>
        {messages.length > 0 && <button type="button" onClick={() => setMessages([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-(--card-spacing)" style={{ maxHeight: 340 }} aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
            <div aria-hidden="true" className="relative size-24 animate-float">
              <div className="orb-sm absolute inset-0 rounded-full" />
              <div className="absolute left-[20%] top-[14%] h-[20%] w-[32%] rotate-[-24deg] rounded-full bg-white/35 blur-[3px]" />
            </div>
            <p className="max-w-[16rem] text-sm text-muted-foreground">Ask about today&apos;s attendance, fees, classes — or how to do anything in ClassPilot.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={message.role === 'user' ? 'ml-8 self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground' : 'mr-6 self-start whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm'}>
              {message.content}
            </div>
          ))
        )}
        {busy && <div className="mr-6 flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Thinking…</div>}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 px-(--card-spacing)">
          {TIPS.map((tip) => (
            <button key={tip} type="button" onClick={() => void send(tip)} className="glass rounded-full px-3 py-1.5 text-xs transition-colors hover:bg-primary/20">{tip}</button>
          ))}
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); void send(input) }} className="mx-(--card-spacing) flex items-center gap-2 rounded-full border border-border bg-background/40 py-1.5 pr-1.5 pl-4 focus-within:border-primary/60">
        <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} placeholder="Ask me about…" aria-label="Ask the assistant" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        <button type="submit" disabled={busy || input.trim().length === 0} aria-label="Send" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"><ArrowUp className="size-4" /></button>
      </form>
    </Card>
  )
}
