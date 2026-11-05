'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, CalendarCheck, BarChart3, CalendarDays, Megaphone, Wallet, LogOut } from 'lucide-react'
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

export function PortalShell({ children, name, role, permissions }: { children: React.ReactNode; name: string; role: string; permissions: Record<string, boolean> }) {
  const pathname = usePathname()
  const visible = items.filter(([, href]) => { const key = href.split('/')[2]; return !key || key === 'profile' || permissions[key] !== false })
  async function signOut() { await createClient().auth.signOut(); window.location.href = '/login' }
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/portal" className="font-display text-lg font-bold text-primary">ClassPilot <span className="font-sans text-xs font-medium text-muted-foreground">Portal</span></Link><div className="flex items-center gap-2"><NotificationCenter portal /><span className="hidden text-sm text-muted-foreground sm:inline">{name} · {role}</span><button onClick={signOut} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><LogOut className="size-4" /> Sign out</button></div></div></header>
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row"><aside className="w-full shrink-0 lg:w-56"><nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">{visible.map(([label, href, Icon]) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${pathname === href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}</Link>)}</nav></aside><main className="min-w-0 flex-1">{children}</main></div>
  </div>
}
