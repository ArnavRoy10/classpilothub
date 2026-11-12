'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Bold, Eraser, Italic, Link2, RefreshCw, RotateCcw, Save, Underline as UnderlineIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RichText } from '@/components/site/rich-text'
import { saveSiteContent } from '@/app/founder/site/actions'
import { SITE_PAGES, type FieldDef } from '@/lib/site-registry'

type Theme = { h1: number; h2: number; h3: number; hb: number }

const PRESETS: ({ name: string } & Theme)[] = [
  { name: 'Sunrise', h1: 42, h2: 88, h3: 8, hb: 320 },
  { name: 'Ocean', h1: 235, h2: 200, h3: 280, hb: 250 },
  { name: 'Emerald', h1: 160, h2: 110, h3: 200, hb: 170 },
  { name: 'Violet', h1: 272, h2: 205, h3: 330, hb: 278 },
  { name: 'Rose', h1: 350, h2: 20, h3: 310, hb: 340 },
  { name: 'Gold', h1: 85, h2: 60, h3: 30, hb: 70 },
]

const SWATCHES = ['#ffffff', '#ffb26b', '#f2704a', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6']
const RAINBOW = 'linear-gradient(90deg, hsl(0 80% 60%), hsl(60 80% 55%), hsl(120 70% 50%), hsl(180 70% 50%), hsl(240 80% 65%), hsl(300 75% 60%), hsl(360 80% 60%))'

const inputClass = 'border-input bg-background w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary/60'

function stripFormatting(text: string) {
  return text
    .replace(/\{#[0-9a-fA-F]{3,8}\|([\s\S]+?)\}/g, '$1')
    .replace(/\[([^\]\n]+)\]\((?:https?:\/\/|mailto:)[^)\s]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\*/g, '')
}

function FieldEditor({ field, value, onChange }: { field: FieldDef; value: string; onChange: (next: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const changed = value !== field.default

  function wrap(before: string, after: string = before) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || 'text'
    onChange(value.slice(0, start) + before + selected + after + value.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  function addLink() {
    const url = window.prompt('Link address (start with https:// or mailto:)')
    if (!url) return
    if (!/^(https?:\/\/|mailto:)\S+$/.test(url)) { toast.error('The link must start with https:// or mailto:'); return }
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const label = value.slice(start, end) || 'link text'
    onChange(value.slice(0, start) + `[${label}](${url})` + value.slice(end))
  }

  return (
    <div className="grid gap-2 rounded-lg border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{field.label}{changed && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">edited</span>}</label>
        {changed && <button type="button" onClick={() => onChange(field.default)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="size-3" />Reset</button>}
      </div>

      {field.kind === 'rich' ? (
        <>
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
            <button type="button" aria-label="Bold" onClick={() => wrap('**')} className="grid size-8 place-items-center rounded hover:bg-muted"><Bold className="size-4" /></button>
            <button type="button" aria-label="Italic" onClick={() => wrap('*')} className="grid size-8 place-items-center rounded hover:bg-muted"><Italic className="size-4" /></button>
            <button type="button" aria-label="Underline" onClick={() => wrap('__')} className="grid size-8 place-items-center rounded hover:bg-muted"><UnderlineIcon className="size-4" /></button>
            <button type="button" aria-label="Link" onClick={addLink} className="grid size-8 place-items-center rounded hover:bg-muted"><Link2 className="size-4" /></button>
            <span className="mx-1 h-5 w-px bg-border" />
            {SWATCHES.map((color) => (
              <button key={color} type="button" aria-label={`Text colour ${color}`} onClick={() => wrap(`{${color}|`, '}')} className="size-5 rounded-full border border-white/20" style={{ background: color }} />
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            <button type="button" aria-label="Clear formatting" onClick={() => onChange(stripFormatting(value))} className="grid size-8 place-items-center rounded hover:bg-muted"><Eraser className="size-4" /></button>
          </div>
          <textarea ref={ref} value={value} onChange={(event) => onChange(event.target.value)} rows={4} maxLength={2000} className={inputClass} />
          <p className="rounded-md bg-muted/30 p-3 text-sm leading-relaxed"><RichText text={value} /></p>
        </>
      ) : field.default.length > 70 ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} maxLength={2000} className={inputClass} />
      ) : (
        <input type={field.kind === 'email' ? 'email' : 'text'} value={value} onChange={(event) => onChange(event.target.value)} maxLength={2000} className={inputClass} />
      )}
      {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
    </div>
  )
}

export function SiteEditor({ fields, initialText, initialTheme }: { fields: FieldDef[]; initialText: Record<string, string>; initialTheme: Theme }) {
  const [tab, setTab] = useState<string>('Colours & brand')
  const [text, setText] = useState<Record<string, string>>(initialText)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [pending, start] = useTransition()
  const [previewKey, setPreviewKey] = useState(0)
  const [previewPath, setPreviewPath] = useState('/')

  const tabs = ['Colours & brand', ...SITE_PAGES]
  const swatch = (hue: number, light = 0.74, chroma = 0.16) => `oklch(${light} ${chroma} ${hue})`

  function save() {
    start(async () => {
      const result = await saveSiteContent({ values: text, theme })
      if (result.ok) {
        toast.success(result.message)
        setTimeout(() => setPreviewKey((key) => key + 1), 1500)
      } else toast.error(result.message)
    })
  }

  const sliders: { key: keyof Theme; label: string; hint: string }[] = [
    { key: 'h1', label: 'Main colour', hint: 'Buttons, highlights, selected items' },
    { key: 'h2', label: 'Highlight colour', hint: 'Glowing details and the first gradient colour' },
    { key: 'h3', label: 'Accent colour', hint: 'The last gradient colour and soft glows' },
    { key: 'hb', label: 'Background tint', hint: 'The dark base colour of every page' },
  ]

  const groups = Array.from(new Set(fields.filter((field) => field.page === tab).map((field) => field.group)))

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-4">
        <div className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/90 p-3 backdrop-blur">
          <div className="flex flex-wrap gap-1">
            {tabs.map((name) => (
              <button key={name} type="button" onClick={() => setTab(name)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === name ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{name}</button>
            ))}
          </div>
          <Button onClick={save} disabled={pending}><Save data-icon="inline-start" />{pending ? 'Saving…' : 'Save changes'}</Button>
        </div>

        {tab === 'Colours & brand' ? (
          <>
            <Card>
              <CardHeader><CardTitle>Ready-made palettes</CardTitle><CardDescription>Pick one, then fine-tune with the sliders below.</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button key={preset.name} type="button" onClick={() => setTheme({ h1: preset.h1, h2: preset.h2, h3: preset.h3, hb: preset.hb })} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted">
                    <span className="flex -space-x-1">{[preset.h1, preset.h2, preset.h3].map((hue) => <span key={hue} className="size-4 rounded-full ring-2 ring-background" style={{ background: swatch(hue) }} />)}</span>
                    {preset.name}
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Colour sliders</CardTitle><CardDescription>Changes the whole website and every dashboard.</CardDescription></CardHeader>
              <CardContent className="grid gap-5">
                {sliders.map((slider) => (
                  <div key={slider.key} className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-medium">{slider.label}</p><p className="text-xs text-muted-foreground">{slider.hint}</p></div>
                      <div className="flex items-center gap-2">
                        <span className="size-7 rounded-full ring-1 ring-white/20" style={{ background: slider.key === 'hb' ? swatch(theme.hb, 0.22, 0.05) : swatch(theme[slider.key]) }} />
                        <input type="number" min={0} max={360} value={theme[slider.key]} onChange={(event) => setTheme({ ...theme, [slider.key]: Math.min(360, Math.max(0, Number(event.target.value) || 0)) })} className="border-input bg-background w-20 rounded-md border px-2 py-1 text-sm" />
                      </div>
                    </div>
                    <input type="range" min={0} max={360} value={theme[slider.key]} onChange={(event) => setTheme({ ...theme, [slider.key]: Number(event.target.value) })} className="h-2 w-full cursor-pointer appearance-none rounded-full" style={{ background: RAINBOW }} aria-label={slider.label} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Preview of these colours</CardTitle></CardHeader>
              <CardContent>
                <div className="aurora relative overflow-hidden rounded-2xl border border-border p-6" style={{ ['--h1' as string]: theme.h1, ['--h2' as string]: theme.h2, ['--h3' as string]: theme.h3, ['--hb' as string]: theme.hb, background: `oklch(0.15 0.03 ${theme.hb})` }}>
                  <div className="aurora absolute inset-0" />
                  <div className="relative flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-3xl font-bold" style={{ color: 'oklch(0.97 0.015 85)' }}>Run the class.</p>
                      <p className="text-gradient font-display text-3xl font-bold">Not the chaos.</p>
                      <div className="mt-4 flex gap-2">
                        <span className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: swatch(theme.h1), color: `oklch(0.17 0.04 ${theme.hb})` }}>Start free trial</span>
                        <span className="glass rounded-lg px-4 py-2 text-sm" style={{ color: 'oklch(0.97 0.015 85)' }}>Book a demo</span>
                      </div>
                    </div>
                    <div className="orb-sm size-20 shrink-0 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          groups.map((group) => (
            <Card key={group}>
              <CardHeader><CardTitle>{group}</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                {fields.filter((field) => field.page === tab && field.group === group).map((field) => (
                  <FieldEditor key={field.key} field={field} value={text[field.key] ?? field.default} onChange={(next) => setText((current) => ({ ...current, [field.key]: next }))} />
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="xl:sticky xl:top-3 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <CardDescription>Shows what visitors see right now. Save, then it refreshes.</CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <select value={previewPath} onChange={(event) => setPreviewPath(event.target.value)} className="border-input bg-background rounded-md border px-2 py-1.5 text-sm">
                <option value="/">Home</option><option value="/about">About</option><option value="/pricing">Pricing</option><option value="/features">Features</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => setPreviewKey((key) => key + 1)}><RefreshCw data-icon="inline-start" />Refresh</Button>
              <Button size="sm" variant="ghost" render={<a href={previewPath} target="_blank" rel="noopener noreferrer" />}>Open in new tab</Button>
            </div>
          </CardHeader>
          <CardContent>
            <iframe key={`${previewKey}-${previewPath}`} src={previewPath} title="Live preview of your website" className="h-[640px] w-full rounded-xl border border-border bg-background" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
