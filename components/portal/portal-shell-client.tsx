'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, CalendarCheck, BarChart3, CalendarDays, Megaphone, Wallet, LogOut } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { createClient } from '@/lib/supabase/client'
import { NotificationCenter } from '@/components/app/notification-center'

const items = [
  ['Overview', '/portal', LayoutDashboard],
  ['Profile', '/portal/profile', User],
  ['Attendance', '/portal/attendance', CalendarCheck],
  ['Results', '/portal/results', BarChart3],
  ['Timetable', '/portal/timetable', CalendarDays],
  ['Announcements', '/portal/announcements', Megaphone],
  ['Fees', '/portal/fees', Wallet],
] as const

function initialsOf(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'ST'
}

export function PortalShell({ children, name, role, permissions }: { children: React.ReactNode; name: string; role: string; permissions: Record<string, boolean> }) {
  const pathname = usePathname()
  const visible = items.filter(([, href]) => { const key = href.split('/')[2]; return !key || key === 'profile' || permissions[key] !== false })
  async function signOut() { await createClient().auth.signOut(); window.location.href = '/login' }

  return (
    <div className="relative isolate min-h-screen bg-background text-foreground">
      <div aria-hidden="true" className="aurora pointer-events-none fixed inset-0 -z-10 opacity-40" />

      <header className="glass sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center justify-between gap-3 rounded-2xl px-4 sm:mx-6">
        <Link href="/portal" className="flex items-center gap-3" aria-label="ClassPilot student portal">
          <Logo />
          <span className="hidden rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary sm:inline">{role === 'parent' ? 'Parent portal' : 'Student portal'}</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationCenter portal />
          <div className="hidden items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 sm:flex">
            <span className="grid size-7 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">{initialsOf(name)}</span>
            <span className="text-sm font-medium">{name}</span>
          </div>
          <button onClick={signOut} className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm transition-colors hover:bg-muted"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-6 sm:px-6 lg:flex-row">
        <aside className="shrink-0 lg:w-60">
          <nav aria-label="Portal menu" className="glass flex gap-1 overflow-x-auto rounded-2xl p-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
            {visible.map(([label, href, Icon]) => {
              const active = href === '/portal' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${active ? 'bg-primary text-primary-foreground shadow-[0_0_28px_-6px] shadow-primary/70' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
