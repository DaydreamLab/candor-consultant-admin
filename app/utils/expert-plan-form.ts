import type { ExpertPlanWrite } from '~/utils/admin-api'

/** Edit form state — no English name field (C14 / B-04). */
export type ExpertPlanFormState = {
  code: string
  package_plan_id: string
  package_plan_label: string
  name_zh: string
  price: string
  active: boolean
  sort_order: string
}

export type ExpertPlanSnapshot = {
  name_zh: string
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
    name_zh: scalarText(plan.name_zh) || scalarText(plan.name),
    price: numberText(plan.price),
    active: plan.active !== false,
    sort_order: numberText(plan.sort_order, '0')
  }
}

export function snapshotFromExpertPlan(plan: Record<string, unknown>): ExpertPlanSnapshot {
  return {
    name_zh: scalarText(plan.name_zh) || scalarText(plan.name),
    price: finiteNumber(plan.price) ?? 0,
    active: plan.active !== false,
    sort_order: finiteNumber(plan.sort_order) ?? 0
  }
}

export type ExpertPlanFormOptions = {
  /**
   * ops／admin：可改名稱／售價。
   * expert（core #143 `b7c5ed0`／Irice 11/4）：僅 active＋sort_order；
   * name_zh／price 不進 dirty／patch（後端對 name_zh／name_en／price 回 403）。
   */
  allowNamePrice?: boolean
}

export function expertPlanFormIsDirty(
  baseline: ExpertPlanSnapshot | null,
  state: ExpertPlanFormState,
  options: ExpertPlanFormOptions = {}
): boolean {
  if (!baseline) {
    return false
  }
  const allowNamePrice = options.allowNamePrice !== false
  const next = snapshotFromState(state)
  if (allowNamePrice) {
    if (next.name_zh !== baseline.name_zh || next.price !== baseline.price) {
      return true
    }
  }
  return next.active !== baseline.active || next.sort_order !== baseline.sort_order
}

/** Price must be integer > 0 (DESIGN rule 18 / B-05). Expert 略過名稱／售價檢查。 */
export function validateExpertPlanForm(
  state: ExpertPlanFormState,
  options: ExpertPlanFormOptions = {}
): 'name_zh' | 'price' | 'sort_order' | null {
  const allowNamePrice = options.allowNamePrice !== false
  if (allowNamePrice) {
    if (!state.name_zh.trim()) {
      return 'name_zh'
    }
    const price = finiteNumber(state.price)
    if (price == null || price < 1 || !Number.isInteger(price)) {
      return 'price'
    }
  }
  const sortOrder = finiteNumber(state.sort_order)
  if (sortOrder == null || !Number.isInteger(sortOrder)) {
    return 'sort_order'
  }
  return null
}

export function buildExpertPlanPatch(
  baseline: ExpertPlanSnapshot,
  state: ExpertPlanFormState,
  options: ExpertPlanFormOptions = {}
): ExpertPlanWrite {
  const allowNamePrice = options.allowNamePrice !== false
  const next = snapshotFromState(state)
  const patch: ExpertPlanWrite = {}
  if (allowNamePrice) {
    if (next.name_zh !== baseline.name_zh) {
      patch.name_zh = next.name_zh
    }
    if (next.price !== baseline.price) {
      patch.price = next.price
    }
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
