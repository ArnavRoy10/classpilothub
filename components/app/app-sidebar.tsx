'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Logo } from '@/components/brand/logo'
import { appNav } from '@/lib/nav'
import type { UserContext } from '@/lib/supabase/user-context'
import { STAFF_SECTIONS, hasPermission } from '@/lib/permissions'

function canSee(userContext: UserContext | null, href: string) {
  const section = STAFF_SECTIONS.find((item) => item.href === href)
  if (!section || !userContext) return true // dashboard, support and settings are open to every staff member
  return hasPermission(userContext, section.key)
}

export function AppSidebar({ userContext }: { userContext: UserContext | null }) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="px-2 py-1.5" aria-label="ClassPilot dashboard">
          <Logo />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {appNav.map((group) => ({ ...group, items: group.items.filter((item) => canSee(userContext, item.href)) })).filter((group) => group.items.length > 0).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={isActive} render={<Link href={item.href} />}>
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {userContext && (
        <SidebarFooter>
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            <div className="truncate font-medium text-foreground">{userContext.organization.name}</div>
            <div className="capitalize">{userContext.organization.plan} plan</div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
