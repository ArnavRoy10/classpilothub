import { FounderShell } from '@/components/founder/founder-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <FounderShell>{children}</FounderShell>
}
