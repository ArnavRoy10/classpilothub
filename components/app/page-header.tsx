export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  const content = actions ?? children

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-balance text-foreground sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {content && <div className="flex flex-wrap items-center gap-2">{content}</div>}
    </div>
  )
}
