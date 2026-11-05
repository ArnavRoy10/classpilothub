import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/supabase/user-context'
import { PortalShell } from '@/components/portal/portal-shell'
import { getOrganizationBillingState } from '@/lib/billing-gate'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const context = await getUserContext()
  if (!context) redirect('/login')
  if (!['student', 'parent'].includes(context.role)) redirect('/dashboard')
  const billing = await getOrganizationBillingState(context.organization.id, context.organization.plan)
  if (billing.kind === 'suspended') {
    return (
      <div className="flex min-h-svh items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold">Portal temporarily unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{context.organization.name} is currently suspended. Please contact your center for details.</p>
        </div>
      </div>
    )
  }
  return <PortalShell name={context.fullName} role={context.role} permissions={context.permissions}>{children}</PortalShell>
}
