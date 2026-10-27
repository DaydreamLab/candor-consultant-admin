import { describe, expect, it } from 'vitest'
import {
  parseSettingsAnchorHash,
  parseSettingsSplitHash,
  resolveSettingsAnchor,
  settingsHashReplaceTarget,
  SETTINGS_SPLIT_HASH_REDIRECTS,
  visibleSettingsAnchors
} from './settings-anchors'

describe('settings-anchors', () => {
  it('orders hub anchors without privacy or CTA', () => {
    expect(visibleSettingsAnchors('admin')).toEqual([
      'payment',
      'invoice',
      'biomarker',
      'other'
    ])
    expect(visibleSettingsAnchors('expert')).toEqual([
      'payment',
      'invoice',
      'biomarker',
      'other'
    ])
  })

  it('parses hub hashes and falls back for unknown or split hashes', () => {
    expect(parseSettingsAnchorHash('#payment')).toBe('payment')
    expect(parseSettingsAnchorHash('#privacy')).toBeNull()
    expect(parseSettingsAnchorHash('#cta-catalog')).toBeNull()
    expect(resolveSettingsAnchor('#cta-catalog', 'admin')).toBe('payment')
    expect(resolveSettingsAnchor('#privacy', 'ops')).toBe('payment')
    expect(resolveSettingsAnchor('', 'ops')).toBe('payment')
  })

  it('maps legacy split hashes to dedicated routes', () => {
    expect(parseSettingsSplitHash('#privacy')).toBe('privacy')
    expect(parseSettingsSplitHash('#cta-catalog')).toBe('cta-catalog')
    expect(parseSettingsSplitHash('#payment')).toBeNull()
    expect(SETTINGS_SPLIT_HASH_REDIRECTS.privacy).toBe('/settings/privacy')
    expect(SETTINGS_SPLIT_HASH_REDIRECTS['cta-catalog']).toBe('/settings/cta-catalog')
  })

  it('does not force replace on empty hash; only normalizes invalid non-empty hub hashes', () => {
    expect(settingsHashReplaceTarget('', 'admin')).toBeNull()
    expect(settingsHashReplaceTarget('#', 'admin')).toBeNull()
    expect(settingsHashReplaceTarget('#payment', 'admin')).toBeNull()
    expect(settingsHashReplaceTarget('#privacy', 'admin')).toBeNull()
    expect(settingsHashReplaceTarget('#cta-catalog', 'expert')).toBeNull()
    expect(settingsHashReplaceTarget('#not-a-real-anchor', 'ops')).toBe('payment')
  })
})
