import { describe, expect, it } from 'vitest'
import { renderMarkdownToHtml } from './markdown-render'

describe('renderMarkdownToHtml', () => {
  it('escapes raw HTML', () => {
    const html = renderMarkdownToHtml('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders headings, lists, and emphasis', () => {
    const html = renderMarkdownToHtml('# Title\n\n- item\n\n**bold** and *em*')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<ul><li>item</li></ul>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>em</em>')
  })

  it('allows http(s) and relative links only', () => {
    const html = renderMarkdownToHtml('[ok](https://example.com) [rel](/privacy) [bad](javascript:alert(1))')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('href="/privacy"')
    expect(html).not.toContain('javascript:')
  })
})
