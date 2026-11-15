import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { ListingEditor, type EnquiryRow } from '@/components/app/listing-editor'
import { getUserContext } from '@/lib/supabase/user-context'
import { getAdminClient } from '@/lib/supabase/admin'
import type { Listing } from '@/lib/listing'

export const metadata: Metadata = { title: 'Public profile' }
export const dynamic = 'force-dynamic'

export default async function ListingPage() {
  const context = (await getUserContext())!
  const admin = getAdminClient()

  const [listingResult, enquiryResult] = await Promise.all([
    admin.from('public_listings').select('*').eq('organization_id', context.organization.id).maybeSingle(),
    admin.from('listing_enquiries').select('id, student_name, phone, email, message, status, created_at').eq('organization_id', context.organization.id).order('created_at', { ascending: false }).limit(50),
  ])

  if (listingResult.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Public profile" description="Let students find you." />
        <Card><CardContent className="py-8 text-sm text-muted-foreground">
          The public profile tables are not set up yet. Run <code className="rounded bg-muted px-1.5 py-0.5">docs/public-listings.sql</code> in Supabase → SQL Editor, then refresh this page.
          <p className="mt-2 text-xs">({listingResult.error.message})</p>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Public profile" description="Choose whether students can find you, and what they see." />
      <ListingEditor
        listing={(listingResult.data as Listing | null) ?? null}
        enquiries={(enquiryResult.data ?? []) as EnquiryRow[]}
        defaults={{
          display_name: context.organization.name,
          email: context.email,
          listing_type: context.organization.type === 'coaching_center' ? 'coaching_center' : 'teacher',
        }}
      />
    </div>
  )
}
