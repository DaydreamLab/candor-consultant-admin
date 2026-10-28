/**
 * Expert-case-review dosage UI rules (UIUX 2026-10-29):
 * - Adjustable value = capsule count, positive integer ≥ 1
 * - Unit label fixed「顆」; mg／IU only in muted suggestion line
 * - Legacy decimals display with Math.ceil (e.g. 1.2 → 2)
 */

import type { SellablePickRow } from '~/utils/expert-case-sellable'

export type CapsuleDoseValidation
  = | { ok: true, dose: number }
    | { ok: false, code: 'required' | 'invalid' }

/** Display / seed: ceil positive numbers to integer ≥ 1; null if not a positive finite. */
export function ceilCapsuleDose(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return null
  }
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n) || n <= 0) {
    return null
  }
  return Math.max(1, Math.ceil(n))
}

/** Strict integer ≥ 1 for editable capsule dose (rejects decimals / 0 / blank). */
export function validateCapsuleDose(
  raw: string | number | null | undefined
): CapsuleDoseValidation {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ok: false, code: 'required' }
  }
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!/^\d+$/.test(s)) {
      return { ok: false, code: 'invalid' }
    }
    const n = Number(s)
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, code: 'invalid' }
    }
    return { ok: true, dose: n }
  }
  if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 1) {
    return { ok: false, code: 'invalid' }
  }
  return { ok: true, dose: raw }
}

export function defaultCapsuleDoseForItem(
  item: Pick<SellablePickRow, 'daily_dose' | 'daily_servings_min'> | null | undefined
): string {
  if (!item) {
    return '1'
  }
  const fromDose = ceilCapsuleDose(item.daily_dose)
  if (fromDose != null) {
    return String(fromDose)
  }
  const fromMin = ceilCapsuleDose(item.daily_servings_min)
  if (fromMin != null) {
    return String(fromMin)
  }
  return '1'
}

export function formatCapsuleDoseDisplay(
  raw: number | string | null | undefined
): string | null {
  const n = ceilCapsuleDose(raw)
  return n == null ? null : String(n)
}

/** True when report highlights or expert opinion has non-whitespace content. */
export function hasFinalizeCopyContent(
  reportHighlights: string | null | undefined,
  expertOpinion: string | null | undefined
): boolean {
  return Boolean(
    (reportHighlights && reportHighlights.trim())
    || (expertOpinion && expertOpinion.trim())
  )
}

export function itemSpecText(
  item: Record<string, unknown> | null | undefined,
  catalog: Pick<SellablePickRow, 'spec_text'> | null | undefined = null
): string {
  if (catalog?.spec_text?.trim()) {
    return catalog.spec_text.trim()
  }
  if (!item) {
    return ''
  }
  for (const key of ['spec_text', 'spec', 'unit_size_text'] as const) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

/**
 * Prefer a product title that is not glued to mg／IU／g strength.
 * Keeps names already clean; strips a trailing strength token when present.
 */
export function productNameWithoutGluedDose(name: string | null | undefined): string {
  const raw = typeof name === 'string' ? name.trim() : ''
  if (!raw) {
    return ''
  }
  return raw
    .replace(/\s+\d+(?:[.,]\d+)?\s*(?:IU|iu|mg|mcg|µg|ug|g|G)\b\s*$/u, '')
    .trim() || raw
}

export function bumpCapsuleDose(
  raw: string | number | null | undefined,
  delta: number
): string {
  const current = validateCapsuleDose(raw)
  const base = current.ok ? current.dose : (ceilCapsuleDose(raw) ?? 1)
  return String(Math.max(1, base + delta))
}

export function canDecrementCapsuleDose(raw: string | number | null | undefined): boolean {
  const check = validateCapsuleDose(raw)
  return check.ok && check.dose > 1
}

/** Keep／未決＝唯讀；僅「調劑量」可編 stepper。 */
export function isCapsuleDoseEditable(decision: string | null | undefined): boolean {
  return decision === 'adjust'
}

/** 「移除」隱藏劑量列。 */
export function isCapsuleDoseHidden(decision: string | null | undefined): boolean {
  return decision === 'reject'
}

/** 已定稿詳情隱藏「送出定稿」。 */
export function shouldShowSubmitFinalize(status: string | null | undefined): boolean {
  return status === 'awaiting_review'
}
