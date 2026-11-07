'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { appNav } from '@/lib/nav'
import { STAFF_SECTIONS, hasPermission } from '@/lib/permissions'
import type { UserContext } from '@/lib/supabase/user-context'

// Jump to any page you are allowed to open. Press "/" to focus, Enter to go.
export function QuickSearch({ userContext }: { userContext: UserContext | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const pages = useMemo(() => appNav.flatMap((group) => group.items).filter((item) => {
    const section = STAFF_SECTIONS.find((entry) => entry.href === item.href)
    return !section || !userContext || hasPermission(userContext, section.key)
  }), [userContext])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return pages.slice(0, 6)
    return pages.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(term)).slice(0, 6)
  }, [pages, query])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing) { event.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function go(href: string) {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    router.push(href)
  }

  return (
    <div className="relative hidden w-full max-w-xs md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) go(results[0].href)
          if (event.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
        }}
        placeholder="Search pages…  ( / )"
        aria-label="Search pages"
        className="h-10 w-full rounded-full border border-border bg-background/40 pr-4 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background/70"
      />
      {open && results.length > 0 && (
        <ul className="glass absolute top-12 z-50 w-full overflow-hidden rounded-2xl bg-popover/95 p-1.5 shadow-xl">
          {results.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.href}>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => go(item.href)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted/70">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="size-4" /></span>
                  <span className="min-w-0"><span className="block truncate font-medium">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.description}</span></span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
