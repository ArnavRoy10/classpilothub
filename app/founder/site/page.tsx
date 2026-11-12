import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SiteEditor } from '@/components/founder/site-editor'
import { requireFounderAdmin } from '@/lib/founder-admin'
import { getSiteContent } from '@/lib/site-content'
import { SITE_FIELDS } from '@/lib/site-registry'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FounderSitePage() {
  const founder = await requireFounderAdmin()
  if (!founder) redirect('/login')
  const { text, theme } = await getSiteContent()

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-col gap-2 border-b border-border pb-5">
        <Link href="/founder" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Founder console</Link>
        <h1 className="text-3xl font-semibold tracking-tight">Edit your website</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Change colours and text, then press Save. Paragraph fields have a formatting toolbar. Every save is written to the audit log, and the public site updates within about a minute.</p>
      </header>
      <SiteEditor fields={SITE_FIELDS} initialText={text} initialTheme={theme} />
    </main>
  )
}
