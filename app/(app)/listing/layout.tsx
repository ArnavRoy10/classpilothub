import { requireSection } from '@/lib/require-section'

export default async function ListingLayout({ children }: { children: React.ReactNode }) {
  await requireSection('listing')
  return <>{children}</>
}
