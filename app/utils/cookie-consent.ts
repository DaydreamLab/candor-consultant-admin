/** Consent keyed to privacy-policy version (localStorage). */

export const PRIVACY_CONSENT_VERSION_KEY = 'candor.privacy.consent.version'

function browserStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  return window.localStorage
}

export function readConsentedPrivacyVersion(): number | null {
  const store = browserStorage()
  if (!store) {
    return null
  }
  const raw = store.getItem(PRIVACY_CONSENT_VERSION_KEY)
  if (!raw || !/^\d+$/.test(raw.trim())) {
    return null
  }
  const n = Number.parseInt(raw.trim(), 10)
  return n >= 1 ? n : null
}

export function writeConsentedPrivacyVersion(version: number): void {
  const store = browserStorage()
  if (!store || !Number.isInteger(version) || version < 1) {
    return
  }
  store.setItem(PRIVACY_CONSENT_VERSION_KEY, String(version))
}

export function needsPrivacyConsent(currentVersion: number | null): boolean {
  if (currentVersion === null || !Number.isInteger(currentVersion) || currentVersion < 1) {
    return false
  }
  const consented = readConsentedPrivacyVersion()
  return consented !== currentVersion
}
