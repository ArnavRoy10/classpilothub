// Server-safe helpers used by the portal pages. The interactive shell lives in portal-shell-client.tsx.
export { PortalShell } from '@/components/portal/portal-shell-client'

export function PortalHeader({ title, description }: { title: string; description: string }) { return <div className="mb-6"><h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div> }

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div> }

export function EmptyState({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{text}</div> }

export function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '—' }
export function formatTime(value?: string | null) { return value ? value.slice(0, 5) : '—' }
export function money(value: number) { return `₹${value.toLocaleString('en-IN')}` }

export function PortalTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) { return <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-muted/40"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium text-muted-foreground">{header}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 align-top">{cell}</td>)}</tr>)}</tbody></table></div> }

export function StatusPill({ children }: { children: React.ReactNode }) { return <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{children}</span> }
