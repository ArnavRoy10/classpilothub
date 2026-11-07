'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

// Requests that must keep working while the organisation is in view-only mode.
const ALLOWED_API_PREFIXES = ['/api/billing/razorpay', '/api/billing/status', '/api/auth/', '/api/assistant']
const ALLOWED_TABLES = ['notifications']
const MESSAGE = 'View-only mode: your organisation has an unpaid bill. Pay to be able to make changes again.'

// Rejects every write the dashboard tries to make (saving, adding, deleting) while suspended.
// This is the quick, friendly layer; the database triggers in docs/read-only-mode.sql are the real lock.
export function ReadOnlyGuard() {
  useEffect(() => {
    const original = window.fetch
    let lastToast = 0

    let supabaseHost = ''
    try { supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host } catch { /* no host: only own /api is guarded */ }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : null
      const method = (init?.method ?? request?.method ?? 'GET').toUpperCase()
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return original(input, init)

      const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      let url: URL
      try { url = new URL(raw, window.location.href) } catch { return original(input, init) }

      const isOwnApi = url.origin === window.location.origin && url.pathname.startsWith('/api/')
      const isSupabaseData = Boolean(supabaseHost) && url.host === supabaseHost && (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/storage/v1/'))
      if (!isOwnApi && !isSupabaseData) return original(input, init)

      if (isOwnApi && ALLOWED_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return original(input, init)
      if (isSupabaseData) {
        if (url.pathname.startsWith('/rest/v1/rpc/')) return original(input, init) // reads such as current_user_organization_id
        const table = url.pathname.replace('/rest/v1/', '').split('/')[0]
        if (ALLOWED_TABLES.includes(table)) return original(input, init)
      }

      if (Date.now() - lastToast > 3000) { lastToast = Date.now(); toast.error(MESSAGE) }
      return new Response(JSON.stringify({ error: MESSAGE, message: MESSAGE }), { status: 402, headers: { 'content-type': 'application/json' } })
    }

    return () => { window.fetch = original }
  }, [])

  return null
}
