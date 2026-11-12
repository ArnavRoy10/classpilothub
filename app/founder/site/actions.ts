'use server'

import { revalidatePath } from 'next/cache'
import { requireFounderAdmin, writeFounderAudit } from '@/lib/founder-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { clearSiteContentCache } from '@/lib/site-content'
import { SITE_FIELDS } from '@/lib/site-registry'

export type SaveResult = { ok: boolean; message: string }

type Input = {
  values: Record<string, string>
  theme: { h1: number; h2: number; h3: number; hb: number }
}

// Only a founder can save. Anything equal to the built-in text is removed, so the original text applies.
export async function saveSiteContent(input: Input): Promise<SaveResult> {
  const founder = await requireFounderAdmin()
  if (!founder) return { ok: false, message: 'Not allowed.' }

  const themeKeys = ['h1', 'h2', 'h3', 'hb'] as const
  for (const name of themeKeys) {
    const value = Number(input.theme?.[name])
    if (!Number.isFinite(value) || value < 0 || value > 360) return { ok: false, message: 'Colours must be between 0 and 360.' }
  }

  const rows: { key: string; value: string | number; updated_by: string }[] = []
  const removeKeys: string[] = []
  for (const field of SITE_FIELDS) {
    const value = String(input.values?.[field.key] ?? '').trim()
    if (value.length > 2000) return { ok: false, message: `"${field.label}" is too long (2000 characters at most).` }
    if (field.kind === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { ok: false, message: `"${field.label}" is not a valid email address.` }
    if (!value || value === field.default) removeKeys.push(field.key)
    else rows.push({ key: field.key, value, updated_by: founder.email })
  }
  for (const name of themeKeys) rows.push({ key: `theme.${name}`, value: Math.round(Number(input.theme[name])), updated_by: founder.email })

  try {
    const admin = getAdminClient()
    const { error } = await admin.from('site_content').upsert(rows.map((row) => ({ ...row, updated_at: new Date().toISOString() })), { onConflict: 'key' })
    if (error) throw new Error(error.message)
    if (removeKeys.length) {
      const { error: deleteError } = await admin.from('site_content').delete().in('key', removeKeys)
      if (deleteError) throw new Error(deleteError.message)
    }
    await writeFounderAudit({ adminUserId: founder.id, adminEmail: founder.email, action: 'update_site_content', targetType: 'site', metadata: { changedFields: rows.length - themeKeys.length, resetFields: removeKeys.length } })
    clearSiteContentCache()
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Saved. The public site updates within about a minute.' }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error'
    const hint = detail.includes('site_content') ? ' Have you run docs/site-content.sql in Supabase?' : ''
    return { ok: false, message: `Could not save: ${detail}.${hint}` }
  }
}
