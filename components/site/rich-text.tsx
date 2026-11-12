import type { ReactNode } from 'react'

// Formatting marks used in editable text:
//   **bold**   *italic*   __underline__   {#ff8800|coloured text}   [link text](https://example.com)
const PATTERNS: { name: 'color' | 'bold' | 'underline' | 'italic' | 'link'; regex: RegExp }[] = [
  { name: 'color', regex: /\{(#[0-9a-fA-F]{3,8})\|([\s\S]+?)\}/ },
  { name: 'bold', regex: /\*\*([\s\S]+?)\*\*/ },
  { name: 'underline', regex: /__([\s\S]+?)__/ },
  { name: 'italic', regex: /\*([^*\n]+?)\*/ },
  { name: 'link', regex: /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/ },
]

function lines(text: string, keyBase: string): ReactNode[] {
  return text.split('\n').flatMap((line, index) => (index === 0 ? [line] : [<br key={`${keyBase}-br${index}`} />, line]))
}

function parse(text: string, depth: number, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let count = 0

  while (rest.length > 0) {
    let best: { match: RegExpExecArray; name: string } | null = null
    if (depth < 4) {
      for (const pattern of PATTERNS) {
        const match = pattern.regex.exec(rest)
        if (match && (!best || match.index < best.match.index)) best = { match, name: pattern.name }
      }
    }
    if (!best) {
      out.push(...lines(rest, `${keyBase}-t${count}`))
      break
    }

    const { match, name } = best
    if (match.index > 0) out.push(...lines(rest.slice(0, match.index), `${keyBase}-p${count}`))
    const key = `${keyBase}-${count++}`

    if (name === 'color') out.push(<span key={key} style={{ color: match[1] }}>{parse(match[2], depth + 1, key)}</span>)
    else if (name === 'bold') out.push(<strong key={key}>{parse(match[1], depth + 1, key)}</strong>)
    else if (name === 'underline') out.push(<u key={key}>{parse(match[1], depth + 1, key)}</u>)
    else if (name === 'italic') out.push(<em key={key}>{parse(match[1], depth + 1, key)}</em>)
    else out.push(<a key={key} href={match[2]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{match[1]}</a>)

    rest = rest.slice(match.index + match[0].length)
  }
  return out
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{parse(text, 0, 'r')}</span>
}
