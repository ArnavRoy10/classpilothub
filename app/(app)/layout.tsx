import { redirect } from 'next/navigation'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app/app-sidebar'
import { AppTopbar } from '@/components/app/app-topbar'
import { PaymentDuePopup, ReadOnlyBanner, SuspendedPopup } from '@/components/app/billing-gate'
import { ReadOnlyGuard } from '@/components/app/read-only-guard'
import { getUserContext } from '@/lib/supabase/user-context'
import { getOrganizationBillingState } from '@/lib/billing-gate'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userContext = await getUserContext()
  if (!userContext) redirect('/login')

  // Students and parents only ever use the portal.
  if (['student', 'parent'].includes(userContext.role)) redirect('/portal')

  const billing = await getOrganizationBillingState(userContext.organization.id, userContext.organization.plan)
  const isOwner = userContext.role === 'owner'

  // Unpaid for more than the grace period: the dashboard stays visible but is view-only.
  const readOnly = billing.kind === 'suspended'

  return (
    <SidebarProvider>
      <AppSidebar userContext={userContext} />
      <SidebarInset>
        <AppTopbar userContext={userContext} />
        {readOnly && <ReadOnlyBanner state={billing} isOwner={isOwner} />}
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">{children}</div>
      </SidebarInset>
      {billing.kind === 'grace' && <PaymentDuePopup state={billing} isOwner={isOwner} orgName={userContext.organization.name} />}
      {readOnly && <ReadOnlyGuard />}
      {readOnly && <SuspendedPopup state={billing} isOwner={isOwner} orgName={userContext.organization.name} />}
    </SidebarProvider>
  )
}
