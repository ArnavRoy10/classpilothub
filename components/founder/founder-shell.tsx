'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BriefcaseBusiness, LayoutDashboard, LifeBuoy, LogOut, Palette, ScrollText } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { FounderPhoto } from '@/components/founder/founder-photo'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const items = [
  { label: 'Overview', href: '/founder', icon: LayoutDashboard, exact: true },
  { label: 'Customer health', href: '/founder/customer-health', icon: Activity },
  { label: 'Leads', href: '/admin/leads', icon: BriefcaseBusiness },
  { label: 'Support', href: '/admin/support', icon: LifeBuoy },
  { label: 'Website', href: '/founder/site', icon: Palette },
  { label: 'Audit log', href: '/founder/audit-log', icon: ScrollText },
]

export function FounderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="relative isolate min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6">
          <Link href="/founder" className="flex items-center gap-3" aria-label="ClassPilot founder console">
            <Logo />
            <span className="hidden rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary sm:inline">Founder console</span>
          </Link>
          <div className="flex items-center gap-2">
            <FounderPhoto size={32} />
            <button
              onClick={signOut}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm transition-colors hover:bg-muted"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav aria-label="Founder sections" className="flex gap-1 overflow-x-auto px-3 pb-2 sm:px-6">
          {items.map(({ label, href, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-primary/15 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </header>
      <div className="px-3 py-6 sm:px-6">{children}</div>
    </div>
  )
}
