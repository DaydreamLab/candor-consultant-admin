import type { ExpertPlanWrite } from '~/utils/admin-api'

export type ExpertPlanFormState = {
  code: string
  package_plan_id: string
  package_plan_label: string
  name_zh: string
  name_en: string
  price: string
  active: boolean
  sort_order: string
}

export type ExpertPlanSnapshot = {
  name_zh: string
  name_en: string | null
  price: number
  active: boolean
  sort_order: number
}

export function emptyExpertPlanFormState(): ExpertPlanFormState {
  return {
    code: '',
    package_plan_id: '',
    package_plan_label: '',
    name_zh: '',
    name_en: '',
    price: '',
    active: true,
    sort_order: '0'
  }
}

export function expertPlanFormStateFromPlan(plan: Record<string, unknown>): ExpertPlanFormState {
  const packagePlanId = scalarText(plan.package_plan_id)
  const packagePlanName = scalarText(plan.package_plan_name_zh)
    || scalarText(plan.package_plan_name)
    || scalarText(plan.package_plan_code)
  return {
    code: scalarText(plan.code),
    package_plan_id: packagePlanId,
    package_plan_label: packagePlanName || packagePlanId,
    name_zh: scalarText(plan.name_zh),
    name_en: scalarText(plan.name_en),
    price: numberText(plan.price),
    active: plan.active !== false,
    sort_order: numberText(plan.sort_order, '0')
  }
}

export function snapshotFromExpertPlan(plan: Record<string, unknown>): ExpertPlanSnapshot {
  return {
    name_zh: scalarText(plan.name_zh),
    name_en: optionalText(plan.name_en),
    price: finiteNumber(plan.price) ?? 0,
    active: plan.active !== false,
    sort_order: finiteNumber(plan.sort_order) ?? 0
  }
}

export function expertPlanFormIsDirty(
  baseline: ExpertPlanSnapshot | null,
  state: ExpertPlanFormState
): boolean {
  if (!baseline) {
    return false
  }
  const next = snapshotFromState(state)
  return next.name_zh !== baseline.name_zh
    || next.name_en !== baseline.name_en
    || next.price !== baseline.price
    || next.active !== baseline.active
    || next.sort_order !== baseline.sort_order
}

export function validateExpertPlanForm(state: ExpertPlanFormState): 'name_zh' | 'price' | 'sort_order' | null {
  if (!state.name_zh.trim()) {
    return 'name_zh'
  }
  const price = finiteNumber(state.price)
  if (price == null || price < 1 || !Number.isInteger(price)) {
    return 'price'
  }
  const sortOrder = finiteNumber(state.sort_order)
  if (sortOrder == null || !Number.isInteger(sortOrder)) {
    return 'sort_order'
  }
  return null
}

export function buildExpertPlanPatch(
  baseline: ExpertPlanSnapshot,
  state: ExpertPlanFormState
): ExpertPlanWrite {
  const next = snapshotFromState(state)
  const patch: ExpertPlanWrite = {}
  if (next.name_zh !== baseline.name_zh) {
    patch.name_zh = next.name_zh
  }
  if (next.name_en !== baseline.name_en) {
    patch.name_en = next.name_en
  }
  if (next.price !== baseline.price) {
    patch.price = next.price
  }
  if (next.active !== baseline.active) {
    patch.active = next.active
  }
  if (next.sort_order !== baseline.sort_order) {
    patch.sort_order = next.sort_order
  }
  return patch
}

function snapshotFromState(state: ExpertPlanFormState): ExpertPlanSnapshot {
  return {
    name_zh: state.name_zh.trim(),
    name_en: state.name_en.trim() ? state.name_en.trim() : null,
    price: finiteNumber(state.price) ?? 0,
    active: state.active,
    sort_order: finiteNumber(state.sort_order) ?? 0
  }
}

function scalarText(value: unknown) {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function optionalText(value: unknown): string | null {
  const text = scalarText(value).trim()
  return text || null
}

function numberText(value: unknown, fallback = '') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return value.trim()
  }
  return fallback
}

function finiteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}
