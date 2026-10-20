import { describe, expect, it } from 'vitest'
import {
  buildPackagePlanPatch,
  moveFeatureRow,
  originalPriceErrorMessage,
  originalPriceIssue,
  packagePlanFormIsDirty,
  packagePlanFormStateFromPlan,
  snapshotFromPlan,
  validatePackagePlanForm
} from './package-plan-form'

const basePlan = {
  id: 'pp-1',
  code: 'standard',
  name_zh: '標準方案',
  name_en: 'Standard',
  description: '說明',
  description_en: 'English desc',
  price: 3000,
  period_days: 30,
  pack_capacity: 8,
  core_count: 3,
  sort_order: 0,
  active: true,
  original_price: 3600,
  features: ['功能一', '功能二'],
  features_en: ['Feature A'],
  badge: '推薦',
  badge_en: 'Recommended',
  highlight: true
}

describe('packagePlanFormStateFromPlan', () => {
  it('reads deployed API field names (features, badge, highlight)', () => {
    const state = packagePlanFormStateFromPlan({
      ...basePlan,
      features: ['A'],
      features_en: ['B'],
      badge: '熱門',
      badge_en: 'Hot',
      highlight: true,
      price: 8000,
      original_price: 8000
    })
    expect(state.home_features_zh).toEqual(['A'])
    expect(state.home_badge_zh).toBe('熱門')
    expect(state.home_highlight).toBe(true)
    expect(state.original_price).toBe('8000')
  })

  it('reads description_en from GET payload', () => {
    const state = packagePlanFormStateFromPlan({
      ...basePlan,
      description_en: 'Plan overview'
    })
    expect(state.description_en).toBe('Plan overview')
    const snapshot = snapshotFromPlan({
      ...basePlan,
      description_en: null
    })
    expect(snapshot.description_en).toBeNull()
  })

  it('tolerates missing home and original_price fields', () => {
    const state = packagePlanFormStateFromPlan({
      ...basePlan,
      original_price: undefined,
      features: undefined,
      badge: undefined,
      highlight: undefined
    })
    expect(state.original_price).toBe('')
    expect(state.home_features_zh).toEqual([])
    expect(state.home_badge_zh).toBe('')
    expect(state.home_highlight).toBe(false)
  })
})

const priceMessages = {
  emptyInvalid: 'invalid-int',
  belowPrice: (price: number) => `below:${price}`
}

describe('originalPriceErrorMessage', () => {
  it('accepts empty original price string', () => {
    const state = packagePlanFormStateFromPlan(basePlan)
    state.original_price = ''
    expect(originalPriceErrorMessage(state, priceMessages)).toBeNull()
  })

  it('accepts equal and greater original vs sale price (string and number inputs)', () => {
    const state = packagePlanFormStateFromPlan({ ...basePlan, price: 8000 })
    state.original_price = '8000'
    expect(originalPriceErrorMessage(state, priceMessages)).toBeNull()
    state.original_price = 12000 as unknown as string
    expect(originalPriceErrorMessage(state, priceMessages)).toBeNull()
    state.price = 6000 as unknown as string
    expect(originalPriceErrorMessage(state, priceMessages)).toBeNull()
  })

  it('rejects non-integer and values below plan price', () => {
    const state = packagePlanFormStateFromPlan(basePlan)
    state.original_price = '2999.5'
    expect(originalPriceErrorMessage(state, priceMessages)).toBe('invalid-int')
    state.original_price = '2500'
    expect(originalPriceErrorMessage(state, priceMessages)).toBe('below:3000')
    state.original_price = '3000'
    expect(originalPriceIssue(state)).toBeNull()
  })
})

describe('packagePlanFormIsDirty', () => {
  it('is false when state matches snapshot and true after edits', () => {
    const snapshot = snapshotFromPlan(basePlan)
    const state = packagePlanFormStateFromPlan(basePlan)
    expect(packagePlanFormIsDirty(snapshot, state)).toBe(false)
    state.name_zh = '變更'
    expect(packagePlanFormIsDirty(snapshot, state)).toBe(true)
  })
})

describe('buildPackagePlanPatch', () => {
  it('returns only changed fields', () => {
    const snapshot = snapshotFromPlan(basePlan)
    const state = packagePlanFormStateFromPlan(basePlan)
    expect(buildPackagePlanPatch(snapshot, state)).toEqual({})

    state.name_zh = '新名稱'
    state.original_price = ''
    state.home_features_zh = ['功能一', '功能二', '功能三']
    state.home_highlight = false
    expect(buildPackagePlanPatch(snapshot, state)).toEqual({
      name_zh: '新名稱',
      original_price: null,
      features: ['功能一', '功能二', '功能三'],
      highlight: false
    })
  })

  it('patches description_en with null when cleared to empty string', () => {
    const snapshot = snapshotFromPlan(basePlan)
    const state = packagePlanFormStateFromPlan(basePlan)
    state.description_en = '   '
    expect(buildPackagePlanPatch(snapshot, state)).toEqual({
      description_en: null
    })
  })

  it('omits description_en when unchanged including null', () => {
    const snapshot = snapshotFromPlan({
      ...basePlan,
      description_en: null
    })
    const state = packagePlanFormStateFromPlan({
      ...basePlan,
      description_en: null
    })
    state.description_en = ''
    expect(buildPackagePlanPatch(snapshot, state)).toEqual({})
  })

  it('sends description_en when text changes', () => {
    const snapshot = snapshotFromPlan(basePlan)
    const state = packagePlanFormStateFromPlan(basePlan)
    state.description_en = 'Updated EN'
    expect(buildPackagePlanPatch(snapshot, state)).toEqual({
      description_en: 'Updated EN'
    })
  })

  it('clears feature lists when all lines are removed', () => {
    const snapshot = snapshotFromPlan(basePlan)
    const state = packagePlanFormStateFromPlan(basePlan)
    state.home_features_en = []
    expect(buildPackagePlanPatch(snapshot, state)).toEqual({
      features_en: null
    })
  })
})

describe('moveFeatureRow', () => {
  it('reorders rows without mutating the source array', () => {
    const rows = ['a', 'b', 'c']
    expect(moveFeatureRow(rows, 1, -1)).toEqual(['b', 'a', 'c'])
    expect(rows).toEqual(['a', 'b', 'c'])
  })
})

describe('validatePackagePlanForm', () => {
  it('blocks submit when core validation fails', () => {
    const state = packagePlanFormStateFromPlan(basePlan)
    state.name_zh = '   '
    expect(validatePackagePlanForm(state)).toEqual({ field: 'form' })
  })
})
