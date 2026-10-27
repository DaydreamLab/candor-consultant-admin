import type { OperatorRole } from '~/types/operator'

/** Settings hub left-anchor ids — privacy／CTA 已拆獨立頁，不在此列。 */
export const SETTINGS_ANCHOR_IDS = [
  'payment',
  'invoice',
  'biomarker',
  'other'
] as const

export type SettingsAnchorId = (typeof SETTINGS_ANCHOR_IDS)[number]

/** Legacy hashes that redirect off the hub onto dedicated settings-group pages. */
export const SETTINGS_SPLIT_HASH_REDIRECTS = {
  'privacy': '/settings/privacy',
  'cta-catalog': '/settings/cta-catalog'
} as const

export type SettingsSplitHash = keyof typeof SETTINGS_SPLIT_HASH_REDIRECTS

export function visibleSettingsAnchors(_role?: OperatorRole | null | undefined): SettingsAnchorId[] {
  return [...SETTINGS_ANCHOR_IDS]
}

export function parseSettingsAnchorHash(hash: string | null | undefined): SettingsAnchorId | null {
  const raw = (hash || '').replace(/^#/, '').trim()
  if (!raw) {
    return null
  }
  return (SETTINGS_ANCHOR_IDS as readonly string[]).includes(raw)
    ? (raw as SettingsAnchorId)
    : null
}

export function parseSettingsSplitHash(hash: string | null | undefined): SettingsSplitHash | null {
  const raw = (hash || '').replace(/^#/, '').trim()
  if (raw === 'privacy' || raw === 'cta-catalog') {
    return raw
  }
  return null
}

export function resolveSettingsAnchor(
  hash: string | null | undefined,
  role?: OperatorRole | null | undefined
): SettingsAnchorId {
  const visible = visibleSettingsAnchors(role)
  const fromHash = parseSettingsAnchorHash(hash)
  if (fromHash && visible.includes(fromHash)) {
    return fromHash
  }
  return visible[0] ?? 'payment'
}

/**
 * Hash that should be written via router.replace, or null to leave the URL alone.
 * Empty hash must NOT replace — with SPA / GH Pages trailing-slash, immediate
 * `#payment` replace from `/settings` can re-enter and freeze the main thread.
 * UI still falls back via resolveSettingsAnchor; only normalize non-empty invalid hashes.
 * Split hashes (privacy／cta-catalog) are handled by navigateTo, not replace.
 */
export function settingsHashReplaceTarget(
  hash: string | null | undefined,
  role?: OperatorRole | null | undefined
): SettingsAnchorId | null {
  if (parseSettingsSplitHash(hash)) {
    return null
  }
  const raw = (hash || '').replace(/^#/, '').trim()
  if (!raw) {
    return null
  }
  const resolved = resolveSettingsAnchor(hash, role)
  return raw === resolved ? null : resolved
}
