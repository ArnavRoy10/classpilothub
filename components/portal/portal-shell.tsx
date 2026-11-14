import type { LucideIcon } from 'lucide-react'

export { PortalShell } from '@/components/portal/portal-shell-client'

export function PortalHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      <div aria-hidden="true" className="mt-4 h-1 w-16 rounded-full" style={{ background: 'linear-gradient(90deg, oklch(0.84 0.14 var(--h2)), oklch(0.72 0.2 var(--h3)))' }} />
    </div>
  )
}

export function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail?: string; icon?: LucideIcon }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="size-4" /></span>}
      </div>
      <p className="mt-3 truncate font-display text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">{text}</div>
}

export function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '—' }
export function formatTime(value?: string | null) { return value ? value.slice(0, 5) : '—' }
export function money(value: number) { return `₹${value.toLocaleString('en-IN')}` }

export function PortalTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-white/[0.03]">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((row, index) => (
            <tr key={index} className="transition-colors hover:bg-white/[0.03]">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3.5 align-top">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatusPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">{children}</span>
}
