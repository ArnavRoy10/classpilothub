export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-16 w-72 animate-pulse rounded-2xl bg-muted/50" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.25fr_1fr]">
        {[0, 1, 2].map((column) => (
          <div key={column} className="flex flex-col gap-4">
            <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  )
}
