import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrganizationControls, MemberRow } from '@/components/founder/org-controls'
import { requireFounderAdmin, writeFounderAudit } from '@/lib/founder-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { computeBillingState, formatDate } from '@/lib/billing-state'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const stateLabel: Record<string, string> = {
  trial: 'Free trial', active: 'Paid / active', grace: 'Payment due (grace period)', suspended: 'Suspended (view-only)', unknown: 'No dates on record',
}

export default async function FounderOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const founder = await requireFounderAdmin()
  if (!founder) redirect('/login')
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const admin = getAdminClient()
  const [{ data: org }, { data: subscription }, { data: members }, studentCount, teacherCount] = await Promise.all([
    admin.from('organizations').select('*').eq('id', id).maybeSingle(),
    admin.from('subscriptions').select('*').eq('organization_id', id).maybeSingle(),
    admin.from('profiles').select('id, full_name, email, role').eq('organization_id', id).order('role'),
    admin.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    admin.from('teachers').select('id', { count: 'exact', head: true }).eq('organization_id', id),
  ])
  if (!org) notFound()

  await writeFounderAudit({ adminUserId: founder.id, adminEmail: founder.email, action: 'view_organization', targetType: 'organization', targetId: id })

  const billing = computeBillingState(subscription, org.plan)
  const free = subscription?.stripe_subscription_id === 'founder:free'

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5">
        <Link href="/founder" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Founder console</Link>
        <h1 className="text-3xl font-semibold tracking-tight">{org.name}</h1>
        <p className="text-sm text-muted-foreground">{org.type} · created {formatDate(org.created_at)} · {studentCount.count ?? 0} students · {teacherCount.count ?? 0} teachers</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Billing status</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">State</p><p className="font-medium">{free ? 'Free (founder grant)' : stateLabel[billing.kind]}</p></div>
          <div><p className="text-xs text-muted-foreground">Plan</p><p className="font-medium">{billing.planName}</p></div>
          <div><p className="text-xs text-muted-foreground">{billing.kind === 'grace' || billing.kind === 'suspended' ? 'Overdue since' : 'Runs until'}</p><p className="font-medium">{free ? '2099' : formatDate(billing.periodEnd)}</p></div>
          <div><p className="text-xs text-muted-foreground">Raw status</p><p className="font-medium">{subscription?.status ?? 'no subscription row'}</p></div>
        </CardContent>
      </Card>

      <OrganizationControls org={{ id: org.id, name: org.name, type: org.type, plan: org.plan, max_students: org.max_students, max_teachers: org.max_teachers }} />

      <Card>
        <CardHeader><CardTitle>Members ({members?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2 pr-4">Person</th><th className="pb-2 pr-4">Role</th><th className="pb-2">Password</th></tr></thead>
            <tbody>
              {(members ?? []).length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No members.</td></tr>}
              {(members ?? []).map((member) => <MemberRow key={member.id} orgId={org.id} member={member} />)}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  )
}
