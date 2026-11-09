const words = ['Attendance', 'Fees', 'Results', 'Batches', 'Timetable', 'Announcements', 'Reports']

// Big outlined ticker, like the kinetic type on the reference sites. Pauses on hover.
export function Marquee() {
  const row = [...words, ...words]
  return (
    <div aria-hidden="true" className="group overflow-hidden border-y border-border py-5">
      <div className="flex w-max animate-marquee gap-10 group-hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-10">
            {row.map((word, index) => (
              <span key={`${copy}-${index}`} className="flex items-center gap-10 font-display text-4xl font-bold tracking-tight text-transparent uppercase [-webkit-text-stroke:1px_oklch(1_0_0/40%)] sm:text-6xl">
                {word}
                <span className="text-neon [-webkit-text-stroke:0]">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}