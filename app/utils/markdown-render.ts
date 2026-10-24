/**
 * Minimal Markdown → safe HTML for privacy-policy display.
 * Supports headings, paragraphs, lists, links, bold, italic, code, hr.
 * Escapes HTML first so raw tags cannot inject scripts.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/`/g, '&#96;')
}

function inlineMarkdown(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>')
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, href: string) => {
      const trimmed = href.trim()
      if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
        return `<a href="${escapeAttr(trimmed)}" rel="noopener noreferrer">${label}</a>`
      }
      return label
    }
  )
  return out
}

export function renderMarkdownToHtml(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const html: string[] = []
  let i = 0
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) {
      return
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
    paragraph = []
  }

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      i += 1
      continue
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushParagraph()
      html.push('<hr>')
      i += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      const level = heading[1]!.length
      html.push(`<h${level}>${inlineMarkdown(heading[2]!)}</h${level}>`)
      i += 1
      continue
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length) {
        const itemLine = (lines[i] ?? '').trim()
        if (!/^[-*+]\s+/.test(itemLine)) {
          break
        }
        items.push(`<li>${inlineMarkdown(itemLine.replace(/^[-*+]\s+/, ''))}</li>`)
        i += 1
      }
      html.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph()
      const items: string[] = []
      while (i < lines.length) {
        const itemLine = (lines[i] ?? '').trim()
        if (!/^\d+\.\s+/.test(itemLine)) {
          break
        }
        items.push(`<li>${inlineMarkdown(itemLine.replace(/^\d+\.\s+/, ''))}</li>`)
        i += 1
      }
      html.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    paragraph.push(trimmed)
    i += 1
  }

  flushParagraph()
  return html.join('\n')
}
