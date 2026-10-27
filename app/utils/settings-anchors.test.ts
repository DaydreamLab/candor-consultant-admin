import { describe, expect, it } from 'vitest'
import {
  parseSettingsAnchorHash,
  resolveSettingsAnchor,
  visibleSettingsAnchors
} from './settings-anchors'

describe('settings-anchors', () => {
  it('orders anchors with CTA after privacy and before other', () => {
    expect(visibleSettingsAnchors('admin')).toEqual([
      'payment',
      'invoice',
      'biomarker',
      'privacy',
      'cta-catalog',
      'other'
    ])
  })

  it('hides CTA catalog for expert', () => {
    expect(visibleSettingsAnchors('expert')).not.toContain('cta-catalog')
    expect(visibleSettingsAnchors('ops')).toContain('cta-catalog')
  })

  it('parses hash and falls back when expert hits CTA hash', () => {
    expect(parseSettingsAnchorHash('#cta-catalog')).toBe('cta-catalog')
    expect(resolveSettingsAnchor('#cta-catalog', 'admin')).toBe('cta-catalog')
    expect(resolveSettingsAnchor('#cta-catalog', 'expert')).toBe('payment')
    expect(resolveSettingsAnchor('', 'ops')).toBe('payment')
  })
})
