import type { OperatorRole } from '~/types/operator'
import { canViewCtaCatalog } from '~/utils/cta-catalog-access'

/** Settings left-anchor ids — order is product IA (design A). */
export const SETTINGS_ANCHOR_IDS = [
  'payment',
  'invoice',
  'biomarker',
  'privacy',
  'cta-catalog',
  'other'
] as const

export type SettingsAnchorId = (typeof SETTINGS_ANCHOR_IDS)[number]

export function visibleSettingsAnchors(role: OperatorRole | null | undefined): SettingsAnchorId[] {
  return SETTINGS_ANCHOR_IDS.filter((id) => {
    if (id === 'cta-catalog') {
      return canViewCtaCatalog(role)
    }
    return true
  })
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

export function resolveSettingsAnchor(
  hash: string | null | undefined,
  role: OperatorRole | null | undefined
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
 */
export function settingsHashReplaceTarget(
  hash: string | null | undefined,
  role: OperatorRole | null | undefined
): SettingsAnchorId | null {
  const raw = (hash || '').replace(/^#/, '').trim()
  if (!raw) {
    return null
  }
  const resolved = resolveSettingsAnchor(hash, role)
  return raw === resolved ? null : resolved
}
