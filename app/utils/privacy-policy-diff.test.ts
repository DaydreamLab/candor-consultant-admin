import { describe, expect, it } from 'vitest'
import { buildSideBySideDiff, splitLines } from './privacy-policy-diff'

describe('splitLines', () => {
  it('splits CRLF and empty string', () => {
    expect(splitLines('')).toEqual([])
    expect(splitLines('a\r\nb')).toEqual(['a', 'b'])
  })
})

describe('buildSideBySideDiff', () => {
  it('pairs equal lines', () => {
    const diff = buildSideBySideDiff('hello\nworld', 'hello\nworld')
    expect(diff.left).toEqual([
      { kind: 'equal', text: 'hello', lineNo: 1 },
      { kind: 'equal', text: 'world', lineNo: 2 }
    ])
    expect(diff.right).toEqual(diff.left)
  })

  it('shows removal on left and empty on right', () => {
    const diff = buildSideBySideDiff('keep\ngone\nkeep2', 'keep\nkeep2')
    expect(diff.left.map(l => l.kind)).toEqual(['equal', 'removed', 'equal'])
    expect(diff.right.map(l => l.kind)).toEqual(['equal', 'empty', 'equal'])
    expect(diff.left[1]?.text).toBe('gone')
  })

  it('shows addition on right and empty on left', () => {
    const diff = buildSideBySideDiff('a\nc', 'a\nb\nc')
    expect(diff.left.map(l => l.kind)).toEqual(['equal', 'empty', 'equal'])
    expect(diff.right.map(l => l.kind)).toEqual(['equal', 'added', 'equal'])
    expect(diff.right[1]?.text).toBe('b')
  })

  it('handles full replace', () => {
    const diff = buildSideBySideDiff('old', 'new')
    expect(diff.left).toEqual([{ kind: 'removed', text: 'old', lineNo: 1 }])
    expect(diff.right).toEqual([{ kind: 'added', text: 'new', lineNo: 1 }])
  })
})
