import 'server-only'

import { cache } from 'react'
import { getAdminClient } from '@/lib/supabase/admin'
import { SITE_FIELDS } from '@/lib/site-registry'

export const DEFAULT_THEME = { h1: 42, h2: 88, h3: 8, hb: 320 }
export type Theme = typeof DEFAULT_THEME

// Short in-memory cache so pages do not query the database on every visit.
let memory: { at: number; rows: Record<string, unknown> } | null = null

async function loadRows(): Promise<Record<string, unknown>> {
  if (memory && Date.now() - memory.at < 30_000) return memory.rows
  try {
    const { data, error } = await getAdminClient().from('site_content').select('key, value')
    if (error) throw new Error(error.message)
    const rows: Record<string, unknown> = {}
    for (const row of data ?? []) rows[row.key as string] = row.value
    memory = { at: Date.now(), rows }
    return rows
  } catch (error) {
    console.error('[site-content] using the built-in text and colours:', error instanceof Error ? error.message : error)
    memory = { at: Date.now() - 20_000, rows: {} } // try again in about 10 seconds
    return {}
  }
}

export function clearSiteContentCache() {
  memory = null
}

// Everything the public pages need: the text of every editable field and the brand colours.
export const getSiteContent = cache(async () => {
  const rows = await loadRows()

  const text: Record<string, string> = {}
  for (const field of SITE_FIELDS) {
    const saved = rows[field.key]
    text[field.key] = typeof saved === 'string' && saved.trim() ? saved : field.default
  }

  const hue = (name: keyof Theme) => {
    const saved = rows[`theme.${name}`]
    return typeof saved === 'number' && saved >= 0 && saved <= 360 ? saved : DEFAULT_THEME[name]
  }
  const theme: Theme = { h1: hue('h1'), h2: hue('h2'), h3: hue('h3'), hb: hue('hb') }

  return { text, theme }
})
