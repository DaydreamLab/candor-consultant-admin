/** Client helpers for expert-case-review sellable pick / dose checks (core PATCH validation). */

export type ExpertCaseItemChangeMode = 'swap' | 'add'

export type SellablePickRow = {
  id: string
  name: string
  code: string
  sku: string
  sale_status: string
  daily_dose: number | null
  daily_servings_min: number | null
  daily_servings_max: number | null
  /** SKU strength text (mg／IU…); muted suggestion only — not stepper unit. */
  spec_text: string | null
}

export function isOnSaleStatus(status: unknown): boolean {
  return String(status ?? '').trim().toLowerCase() === 'on_sale'
}

export function parseSellablePickRow(row: Record<string, unknown>): SellablePickRow | null {
  const id = scalarText(row.id).trim()
  if (!id) {
    return null
  }
  const nameZh = scalarText(row.name_zh).trim()
  const nameEn = scalarText(row.name_en).trim()
  const nameFallback = scalarText(row.name).trim()
  const specText = scalarText(row.spec_text).trim() || scalarText(row.spec).trim()
  return {
    id,
    name: nameZh || nameEn || nameFallback || id,
    code: scalarText(row.code).trim(),
    sku: scalarText(row.sku).trim(),
    sale_status: scalarText(row.sale_status).trim().toLowerCase(),
    daily_dose: finiteNumber(row.daily_dose),
    daily_servings_min: finiteNumber(row.daily_servings_min),
    daily_servings_max: finiteNumber(row.daily_servings_max),
    spec_text: specText || null
  }
}

/** Only sellable (on_sale) rows, optionally filtered by search query. */
export function filterSellablePickRows(
  rows: SellablePickRow[],
  query = ''
): SellablePickRow[] {
  const q = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (!isOnSaleStatus(row.sale_status)) {
      return false
    }
    if (!q) {
      return true
    }
    return searchableText(row).includes(q)
  })
}

export function searchableText(row: SellablePickRow): string {
  return [row.name, row.code, row.sku, row.id].join(' ').toLowerCase()
}

export type DoseValidation
  = | { ok: true, dose: number }
    | { ok: false, code: 'required' | 'invalid' | 'below_min' | 'above_max', min: number | null, max: number | null }

/** Align with sellable_item daily_servings_min／max when present. */
export function validateDailyDose(
  raw: string | number | null | undefined,
  item: Pick<SellablePickRow, 'daily_servings_min' | 'daily_servings_max'> | null
): DoseValidation {
  const min = item?.daily_servings_min ?? null
  const max = item?.daily_servings_max ?? null
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ok: false, code: 'required', min, max }
  }
  const dose = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(dose) || dose <= 0) {
    return { ok: false, code: 'invalid', min, max }
  }
  if (min !== null && dose < min) {
    return { ok: false, code: 'below_min', min, max }
  }
  if (max !== null && dose > max) {
    return { ok: false, code: 'above_max', min, max }
  }
  return { ok: true, dose }
}

export function defaultDoseForItem(item: SellablePickRow | null): string {
  if (!item) {
    return ''
  }
  if (item.daily_dose !== null) {
    return String(item.daily_dose)
  }
  if (item.daily_servings_min !== null) {
    return String(item.daily_servings_min)
  }
  return ''
}

export function reasonIsFilled(reason: string | null | undefined): boolean {
  return Boolean(reason && reason.trim())
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function scalarText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}
