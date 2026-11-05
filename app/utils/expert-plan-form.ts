import type { ExpertPlanCreate, ExpertPlanWrite } from '~/utils/admin-api'

/** Edit／create form state — name_en 可編（Irice 11/4 第二輪；取代 C14 隱藏）。 */
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
  package_plan_id: string
  name_zh: string
  name_en: string | null
  price: number
  active: boolean
  sort_order: number
}

export type ExpertPlanFormField
  = 'package_plan_id'
    | 'name_zh'
    | 'price'
    | 'sort_order'

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

/** 新增預設：下架；排序空白＝排最後。 */
export function emptyExpertPlanCreateState(): ExpertPlanFormState {
  return {
    ...emptyExpertPlanFormState(),
    active: false,
    sort_order: ''
  }
}

/** 選好綁定方案後自動帶入的中文名（前台仍稱專家方案）。 */
export function defaultExpertPlanNameZh(packagePlanName: string): string {
  const name = packagePlanName.trim()
  return name ? `專家方案（${name}）` : ''
}

/**
 * 換綁定時：名稱仍等於上次自動帶入值才重填；已手動改過則保留。
 * 回傳下一次要比對的自動帶入值。
 */
export function applyPackagePlanNameAutofill(
  currentNameZh: string,
  previousAutoName: string,
  nextPackagePlanName: string
): { nameZh: string, autoName: string } {
  const autoName = defaultExpertPlanNameZh(nextPackagePlanName)
  if (!autoName) {
    return { nameZh: currentNameZh, autoName: previousAutoName }
  }
  if (!currentNameZh.trim() || currentNameZh === previousAutoName) {
    return { nameZh: autoName, autoName }
  }
  return { nameZh: currentNameZh, autoName: previousAutoName }
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
    name_en: scalarText(plan.name_en),
    price: numberText(plan.price),
    active: plan.active !== false,
    sort_order: numberText(plan.sort_order, '0')
  }
}

export function snapshotFromExpertPlan(plan: Record<string, unknown>): ExpertPlanSnapshot {
  const nameEn = scalarText(plan.name_en).trim()
  return {
    package_plan_id: scalarText(plan.package_plan_id),
    name_zh: scalarText(plan.name_zh) || scalarText(plan.name),
    name_en: nameEn || null,
    price: finiteNumber(plan.price) ?? 0,
    active: plan.active !== false,
    sort_order: finiteNumber(plan.sort_order) ?? 0
  }
}

export type ExpertPlanFormOptions = {
  /**
   * ops／admin：可改名稱／英文名／售價／綁定方案。
   * expert（core #143 `b7c5ed0`）：僅 active＋sort_order；
   * name_zh／name_en／price／package_plan_id 不進 dirty／patch（後端 403）。
   */
  allowNamePrice?: boolean
  /** create：排序可空白（伺服器排最後）；edit：須為整數。 */
  mode?: 'create' | 'update'
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
    if (
      next.package_plan_id !== baseline.package_plan_id
      || next.name_zh !== baseline.name_zh
      || next.name_en !== baseline.name_en
      || next.price !== baseline.price
    ) {
      return true
    }
  }
  return next.active !== baseline.active || next.sort_order !== baseline.sort_order
}

/**
 * Price must be integer > 0（DESIGN rule 18 / B-05）。
 * create：另需綁定方案；排序可空白。
 * Expert 略過名稱／售價／綁定檢查。
 */
export function validateExpertPlanForm(
  state: ExpertPlanFormState,
  options: ExpertPlanFormOptions = {}
): ExpertPlanFormField | null {
  const allowNamePrice = options.allowNamePrice !== false
  const mode = options.mode ?? 'update'
  if (allowNamePrice) {
    if (mode === 'create' && !state.package_plan_id.trim()) {
      return 'package_plan_id'
    }
    if (!state.name_zh.trim()) {
      return 'name_zh'
    }
    const price = finiteNumber(state.price)
    if (price == null || price < 1 || !Number.isInteger(price)) {
      return 'price'
    }
  }
  if (mode === 'create' && !state.sort_order.trim()) {
    return null
  }
  const sortOrder = finiteNumber(state.sort_order)
  if (sortOrder == null || !Number.isInteger(sortOrder)) {
    return 'sort_order'
  }
  return null
}

/** create 一次回傳所有欄位錯誤（對齊驗證時機：按儲存）。 */
export function validateExpertPlanCreateForm(state: ExpertPlanFormState): ExpertPlanFormField[] {
  const issues: ExpertPlanFormField[] = []
  if (!state.package_plan_id.trim()) {
    issues.push('package_plan_id')
  }
  if (!state.name_zh.trim()) {
    issues.push('name_zh')
  }
  const price = finiteNumber(state.price)
  if (price == null || price < 1 || !Number.isInteger(price)) {
    issues.push('price')
  }
  if (state.sort_order.trim()) {
    const sortOrder = finiteNumber(state.sort_order)
    if (sortOrder == null || !Number.isInteger(sortOrder)) {
      issues.push('sort_order')
    }
  }
  return issues
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
    if (next.package_plan_id !== baseline.package_plan_id) {
      patch.package_plan_id = next.package_plan_id
    }
    if (next.name_zh !== baseline.name_zh) {
      patch.name_zh = next.name_zh
    }
    if (next.name_en !== baseline.name_en) {
      patch.name_en = next.name_en
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

export function buildExpertPlanCreate(state: ExpertPlanFormState): ExpertPlanCreate {
  const payload: ExpertPlanCreate = {
    package_plan_id: state.package_plan_id.trim(),
    name_zh: state.name_zh.trim(),
    price: finiteNumber(state.price) ?? 0,
    active: state.active
  }
  const nameEn = state.name_en.trim()
  if (nameEn) {
    payload.name_en = nameEn
  }
  if (state.sort_order.trim()) {
    const sortOrder = finiteNumber(state.sort_order)
    if (sortOrder != null && Number.isInteger(sortOrder)) {
      payload.sort_order = sortOrder
    }
  }
  return payload
}

function snapshotFromState(state: ExpertPlanFormState): ExpertPlanSnapshot {
  const nameEn = state.name_en.trim()
  return {
    package_plan_id: state.package_plan_id.trim(),
    name_zh: state.name_zh.trim(),
    name_en: nameEn || null,
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
