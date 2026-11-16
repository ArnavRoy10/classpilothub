import { FounderShell } from '@/components/founder/founder-shell'

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return <FounderShell>{children}</FounderShell>
}
