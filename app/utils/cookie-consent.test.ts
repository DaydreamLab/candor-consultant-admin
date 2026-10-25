import { afterEach, describe, expect, it } from 'vitest'
import {
  needsPrivacyConsent,
  PRIVACY_CONSENT_VERSION_KEY,
  readConsentedPrivacyVersion,
  writeConsentedPrivacyVersion
} from './cookie-consent'

describe('cookie-consent', () => {
  afterEach(() => {
    window.localStorage.removeItem(PRIVACY_CONSENT_VERSION_KEY)
  })

  it('reads and writes consented version', () => {
    expect(readConsentedPrivacyVersion()).toBe(null)
    writeConsentedPrivacyVersion(3)
    expect(readConsentedPrivacyVersion()).toBe(3)
  })

  it('needs consent when missing or version changed', () => {
    expect(needsPrivacyConsent(null)).toBe(false)
    expect(needsPrivacyConsent(1)).toBe(true)
    writeConsentedPrivacyVersion(1)
    expect(needsPrivacyConsent(1)).toBe(false)
    expect(needsPrivacyConsent(2)).toBe(true)
  })
})
