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
  it('orders hub anchors without privacy or guidance', () => {
    expect(visibleSettingsAnchors(['admin'])).toEqual([
      'payment',
      'invoice',
      'biomarker',
      'other'
    ])
    expect(visibleSettingsAnchors(['expert'])).toEqual([
      'payment',
      'invoice',
      'biomarker',
      'other'
    ])
  })

  it('parses hub hashes and falls back for unknown or split hashes', () => {
    expect(parseSettingsAnchorHash('#payment')).toBe('payment')
    expect(parseSettingsAnchorHash('#privacy')).toBeNull()
    expect(parseSettingsAnchorHash('#guidance')).toBeNull()
    expect(resolveSettingsAnchor('#guidance', ['admin'])).toBe('payment')
    expect(resolveSettingsAnchor('#privacy', ['ops'])).toBe('payment')
    expect(resolveSettingsAnchor('', ['ops'])).toBe('payment')
  })

  it('maps split hashes to dedicated routes', () => {
    expect(parseSettingsSplitHash('#privacy')).toBe('privacy')
    expect(parseSettingsSplitHash('#guidance')).toBe('guidance')
    expect(parseSettingsSplitHash('#payment')).toBeNull()
    expect(SETTINGS_SPLIT_HASH_REDIRECTS.privacy).toBe('/settings/privacy')
    expect(SETTINGS_SPLIT_HASH_REDIRECTS.guidance).toBe('/settings/guidance')
  })

  it('does not force replace on empty hash; only normalizes invalid non-empty hub hashes', () => {
    expect(settingsHashReplaceTarget('', ['admin'])).toBeNull()
    expect(settingsHashReplaceTarget('#', ['admin'])).toBeNull()
    expect(settingsHashReplaceTarget('#payment', ['admin'])).toBeNull()
    expect(settingsHashReplaceTarget('#privacy', ['admin'])).toBeNull()
    expect(settingsHashReplaceTarget('#guidance', ['expert'])).toBeNull()
    expect(settingsHashReplaceTarget('#not-a-real-anchor', ['ops'])).toBe('payment')
  })
})
