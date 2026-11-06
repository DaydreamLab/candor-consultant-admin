import { describe, expect, it } from 'vitest'
import { canEditCtaCatalog, canViewCtaCatalog } from './cta-catalog-access'

describe('cta-catalog-access', () => {
  it('hides catalog from expert-only', () => {
    expect(canViewCtaCatalog(['expert'])).toBe(false)
    expect(canEditCtaCatalog(['expert'])).toBe(false)
  })

  it('allows ops read-only', () => {
    expect(canViewCtaCatalog(['ops'])).toBe(true)
    expect(canEditCtaCatalog(['ops'])).toBe(false)
  })

  it('allows admin edit (incl. admin+expert)', () => {
    expect(canViewCtaCatalog(['admin'])).toBe(true)
    expect(canEditCtaCatalog(['admin'])).toBe(true)
    expect(canEditCtaCatalog(['admin', 'expert'])).toBe(true)
  })

  it('treats missing roles as no access', () => {
    expect(canViewCtaCatalog(null)).toBe(false)
    expect(canEditCtaCatalog(undefined)).toBe(false)
    expect(canViewCtaCatalog([])).toBe(false)
  })
})
