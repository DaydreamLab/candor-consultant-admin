import { describe, expect, it } from 'vitest'
import {
  allowThirdPartyBadgeColor,
  allowThirdPartyLabelKey
} from './knowledge-labels'

describe('allowThirdPartyLabelKey (ADR 0027)', () => {
  it('maps true to yes (allowed)', () => {
    expect(allowThirdPartyLabelKey(true)).toBe('yes')
  })

  it('maps false to no (forbidden)', () => {
    expect(allowThirdPartyLabelKey(false)).toBe('no')
  })

  it('maps null and undefined to unset (allowed by default)', () => {
    expect(allowThirdPartyLabelKey(null)).toBe('unset')
    expect(allowThirdPartyLabelKey(undefined)).toBe('unset')
  })
})

describe('allowThirdPartyBadgeColor (ADR 0027)', () => {
  it('uses success for explicit allow', () => {
    expect(allowThirdPartyBadgeColor(true)).toBe('success')
  })

  it('uses error for explicit forbid', () => {
    expect(allowThirdPartyBadgeColor(false)).toBe('error')
  })

  it('uses neutral for null/undefined (no restriction → allowed)', () => {
    expect(allowThirdPartyBadgeColor(null)).toBe('neutral')
    expect(allowThirdPartyBadgeColor(undefined)).toBe('neutral')
  })
})
