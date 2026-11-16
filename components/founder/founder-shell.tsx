'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Building2,
  Headset,
  LayoutDashboard,
  Menu,
  Palette,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

const navigation = [
  { label: 'Overview', href: '/founder', icon: LayoutDashboard },
  { label: 'Organizations', href: '/founder#organizations', icon: Building2 },
  { label: 'Customer health', href: '/founder/customer-health', icon: Activity },
  { label: 'Website studio', href: '/founder/site', icon: Palette },
  { label: 'Audit log', href: '/founder/audit-log', icon: Users },
  { label: 'Leads', href: '/admin/leads', icon: Building2 },
  { label: 'Support queue', href: '/admin/support', icon: Headset },
]

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Founder navigation" className="flex flex-col gap-1">
      {navigation.map(({ label, href, icon: Icon }) => {
        const route = href.split('#')[0]
        const active = pathname === route || (route !== '/founder' && pathname.startsWith(`${route}/`))

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors',
              active
                ? 'bg-primary/15 font-medium text-primary shadow-[inset_0_0_0_1px_var(--border)]'
                : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:scale-105" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function FounderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = navigation.find(({ href }) => {
    const route = href.split('#')[0]
    return pathname === route || (route !== '/founder' && pathname.startsWith(`${route}/`))
  })?.label ?? 'Founder console'

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar/90 px-3 py-5 backdrop-blur-xl lg:flex">
        <Link href="/founder" aria-label="ClassPilot founder console" className="mb-7 px-3 py-1">
          <Logo />
        </Link>
        <div className="mb-3 px-3 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Control room
        </div>
        <NavigationLinks />
        <div className="mt-auto rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-foreground">Founder workspace</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Operations, customers, and product health in one place.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur-xl sm:px-5 lg:px-8">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" className="size-9 lg:hidden" aria-label="Open founder navigation" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(19rem,calc(100vw-2rem))] bg-sidebar px-4">
              <SheetHeader className="px-1">
                <SheetTitle className="text-left"><Logo /></SheetTitle>
              </SheetHeader>
              <div className="mt-5"><NavigationLinks /></div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">ClassPilot · Founder console</p>
          </div>
          <Link href="/" className="ml-auto rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            View website
          </Link>
        </header>
        <div className="min-w-0 px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  )
}
