import type { PackagePlanWrite } from '~/utils/admin-api'

export type PackagePlanFormState = {
  code: string
  name_zh: string
  name_en: string
  description: string
  price: string
  period_days: number
  pack_capacity: string
  core_count: string
  sort_order: string
  active: boolean
  original_price: string
  home_features_zh: string[]
  home_features_en: string[]
  home_badge_zh: string
  home_badge_en: string
  home_highlight: boolean
}

export type PackagePlanSnapshot = {
  name_zh: string
  name_en: string | null
  description: string | null
  price: number
  period_days: number
  pack_capacity: number
  core_count: number
  sort_order: number
  active: boolean
  original_price: number | null
  home_features_zh: string[] | null
  home_features_en: string[] | null
  home_badge_zh: string | null
  home_badge_en: string | null
  home_highlight: boolean | null
}

export type PackagePlanValidationIssue = {
  field: 'original_price' | 'form'
}

export function emptyPackagePlanFormState(): PackagePlanFormState {
  return {
    code: '',
    name_zh: '',
    name_en: '',
    description: '',
    price: '',
    period_days: 30,
    pack_capacity: '8',
    core_count: '3',
    sort_order: '0',
    active: true,
    original_price: '',
    home_features_zh: [],
    home_features_en: [],
    home_badge_zh: '',
    home_badge_en: '',
    home_highlight: false
  }
}

export function packagePlanFormStateFromPlan(plan: Record<string, unknown>): PackagePlanFormState {
  return {
    code: textOf(plan.code),
    name_zh: textOf(plan.name_zh) || textOf(plan.name),
    name_en: textOf(plan.name_en),
    description: textOf(plan.description),
    price: numberText(plan.price),
    period_days: positiveInt(plan.period_days) ?? 30,
    pack_capacity: numberText(plan.pack_capacity, '8'),
    core_count: numberText(plan.core_count, '3'),
    sort_order: numberText(plan.sort_order, '0'),
    active: plan.active !== false,
    original_price: optionalIntText(plan.original_price),
    home_features_zh: stringListToForm(plan.home_features_zh),
    home_features_en: stringListToForm(plan.home_features_en),
    home_badge_zh: textOf(plan.home_badge_zh),
    home_badge_en: textOf(plan.home_badge_en),
    home_highlight: plan.home_highlight === true
  }
}

export function snapshotFromPlan(plan: Record<string, unknown>): PackagePlanSnapshot {
  const price = requiredInt(plan.price) ?? 0
  return {
    name_zh: textOf(plan.name_zh) || textOf(plan.name),
    name_en: nullableTrimmed(plan.name_en),
    description: nullableTrimmed(plan.description),
    price,
    period_days: positiveInt(plan.period_days) ?? 30,
    pack_capacity: requiredInt(plan.pack_capacity) ?? 8,
    core_count: requiredInt(plan.core_count) ?? 3,
    sort_order: requiredInt(plan.sort_order) ?? 0,
    active: plan.active !== false,
    original_price: optionalInt(plan.original_price),
    home_features_zh: optionalStringList(plan.home_features_zh),
    home_features_en: optionalStringList(plan.home_features_en),
    home_badge_zh: nullableTrimmed(plan.home_badge_zh),
    home_badge_en: nullableTrimmed(plan.home_badge_en),
    home_highlight: optionalBoolean(plan.home_highlight)
  }
}

export function originalPriceIssue(state: PackagePlanFormState): PackagePlanValidationIssue | null {
  const trimmed = state.original_price.trim()
  if (!trimmed) {
    return null
  }
  const original = Number(trimmed)
  const price = Number(state.price)
  if (!Number.isInteger(original) || original <= 0) {
    return { field: 'original_price' }
  }
  if (!Number.isInteger(price) || price <= 0) {
    return null
  }
  if (original < price) {
    return { field: 'original_price' }
  }
  return null
}

export function validatePackagePlanForm(state: PackagePlanFormState): PackagePlanValidationIssue | null {
  if (!state.name_zh.trim()) {
    return { field: 'form' }
  }
  const price = Number(state.price)
  if (!Number.isInteger(price) || price <= 0) {
    return { field: 'form' }
  }
  const periodDays = Math.trunc(state.period_days)
  if (!Number.isFinite(periodDays) || periodDays <= 0) {
    return { field: 'form' }
  }
  const packCapacity = Number(state.pack_capacity)
  if (!Number.isInteger(packCapacity) || packCapacity < 1) {
    return { field: 'form' }
  }
  const coreCount = Number(state.core_count)
  if (!Number.isInteger(coreCount) || coreCount < 1 || coreCount > packCapacity) {
    return { field: 'form' }
  }
  const sortOrder = state.sort_order.trim() === '' ? 0 : Number(state.sort_order)
  if (!Number.isInteger(sortOrder)) {
    return { field: 'form' }
  }
  return originalPriceIssue(state)
}

export function buildPackagePlanPatch(
  snapshot: PackagePlanSnapshot,
  state: PackagePlanFormState
): PackagePlanWrite {
  const patch: PackagePlanWrite = {}
  const nameZh = state.name_zh.trim()
  if (nameZh !== snapshot.name_zh) {
    patch.name_zh = nameZh
  }
  const nameEn = state.name_en.trim() || null
  if (nameEn !== snapshot.name_en) {
    patch.name_en = nameEn
  }
  const description = state.description.trim() || null
  if (description !== snapshot.description) {
    patch.description = description
  }
  const price = Number(state.price)
  if (price !== snapshot.price) {
    patch.price = price
  }
  const periodDays = Math.trunc(state.period_days)
  if (periodDays !== snapshot.period_days) {
    patch.period_days = periodDays
  }
  const packCapacity = Number(state.pack_capacity)
  if (packCapacity !== snapshot.pack_capacity) {
    patch.pack_capacity = packCapacity
  }
  const coreCount = Number(state.core_count)
  if (coreCount !== snapshot.core_count) {
    patch.core_count = coreCount
  }
  const sortOrder = state.sort_order.trim() === '' ? 0 : Number(state.sort_order)
  if (sortOrder !== snapshot.sort_order) {
    patch.sort_order = sortOrder
  }
  if (state.active !== snapshot.active) {
    patch.active = state.active
  }

  const originalPrice = parseOriginalPriceField(state.original_price)
  if (originalPrice !== snapshot.original_price) {
    patch.original_price = originalPrice
  }

  const featuresZh = normalizeFeatureList(state.home_features_zh)
  if (!stringListEqual(featuresZh, snapshot.home_features_zh)) {
    patch.home_features_zh = featuresZh
  }
  const featuresEn = normalizeFeatureList(state.home_features_en)
  if (!stringListEqual(featuresEn, snapshot.home_features_en)) {
    patch.home_features_en = featuresEn
  }

  const badgeZh = state.home_badge_zh.trim() || null
  if (badgeZh !== snapshot.home_badge_zh) {
    patch.home_badge_zh = badgeZh
  }
  const badgeEn = state.home_badge_en.trim() || null
  if (badgeEn !== snapshot.home_badge_en) {
    patch.home_badge_en = badgeEn
  }

  const highlight = state.home_highlight
  const snapshotHighlight = snapshot.home_highlight === true
  const normalizedHighlight = snapshot.home_highlight === null ? false : snapshotHighlight
  if (highlight !== normalizedHighlight) {
    patch.home_highlight = highlight
  }

  return patch
}

export function moveFeatureRow(rows: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction
  if (target < 0 || target >= rows.length) {
    return rows
  }
  const next = [...rows]
  const [row] = next.splice(index, 1)
  if (row === undefined) {
    return rows
  }
  next.splice(target, 0, row)
  return next
}

function parseOriginalPriceField(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const n = Number(trimmed)
  if (!Number.isInteger(n)) {
    return null
  }
  return n
}

function normalizeFeatureList(rows: string[]): string[] | null {
  const items = rows.map(row => row.trim()).filter(Boolean)
  return items.length ? items : null
}

function stringListToForm(value: unknown): string[] {
  const list = optionalStringList(value)
  if (!list?.length) {
    return []
  }
  return [...list]
}

function optionalStringList(value: unknown): string[] | null {
  if (value == null) {
    return null
  }
  if (!Array.isArray(value)) {
    return null
  }
  const items = value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
  return items.length ? items : null
}

function stringListEqual(left: string[] | null, right: string[] | null) {
  const a = left ?? null
  const b = right ?? null
  if (a === null && b === null) {
    return true
  }
  if (a === null || b === null) {
    return false
  }
  if (a.length !== b.length) {
    return false
  }
  return a.every((item, index) => item === b[index])
}

function optionalBoolean(value: unknown): boolean | null {
  if (value === true || value === false) {
    return value
  }
  return null
}

function optionalInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isInteger(Number(value))) {
    return Number(value)
  }
  return null
}

function requiredInt(value: unknown): number | null {
  const n = optionalInt(value)
  if (n == null) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value)
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Math.trunc(Number(value))
    }
  }
  return n
}

function optionalIntText(value: unknown) {
  const n = optionalInt(value)
  return n == null ? '' : String(n)
}

function nullableTrimmed(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  return null
}

function textOf(value: unknown) {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function numberText(value: unknown, fallback = '') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return String(Number(value))
  }
  return fallback
}

function positiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isInteger(n) && n > 0) {
      return n
    }
  }
  return null
}
