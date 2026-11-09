import { cn } from '@/lib/utils'

// Headline that rises in word by word. Screen readers get the plain text.
export function WordReveal({ text, delay = 0, wordClassName }: { text: string; delay?: number; wordClassName?: string }) {
  return (
    <span>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.14em] align-bottom">
            <span className={cn('inline-block animate-word-rise', wordClassName)} style={{ animationDelay: `${delay + index * 90}ms` }}>
              {word}
            </span>
            {'\u00A0'}
          </span>
        ))}
      </span>
    </span>
  )
}