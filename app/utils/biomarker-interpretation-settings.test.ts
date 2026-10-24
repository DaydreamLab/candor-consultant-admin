import { describe, expect, it } from 'vitest'
import { normalizeBiomarkerMaxLlmDraft } from './admin-api'

describe('normalizeBiomarkerMaxLlmDraft', () => {
  it('treats empty as unlimited', () => {
    expect(normalizeBiomarkerMaxLlmDraft('')).toBe(null)
    expect(normalizeBiomarkerMaxLlmDraft('   ')).toBe(null)
  })

  it('accepts positive integers', () => {
    expect(normalizeBiomarkerMaxLlmDraft('1')).toBe(1)
    expect(normalizeBiomarkerMaxLlmDraft('42')).toBe(42)
  })

  it('treats zero as unlimited and rejects other invalid input', () => {
    expect(normalizeBiomarkerMaxLlmDraft('0')).toBe(null)
    expect(normalizeBiomarkerMaxLlmDraft('-3')).toBe('invalid')
    expect(normalizeBiomarkerMaxLlmDraft('1.5')).toBe('invalid')
    expect(normalizeBiomarkerMaxLlmDraft('abc')).toBe('invalid')
  })
})
