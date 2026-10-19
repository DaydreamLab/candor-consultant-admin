import { describe, expect, it } from 'vitest'
import {
  buildPackagePlanPatch,
  moveFeatureRow,
  originalPriceIssue,
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
  price: 3000,
  period_days: 30,
  pack_capacity: 8,
  core_count: 3,
  sort_order: 0,
  active: true,
  original_price: 3600,
  home_features_zh: ['功能一', '功能二'],
  home_features_en: ['Feature A'],
  home_badge_zh: '推薦',
  home_badge_en: 'Recommended',
  home_highlight: true
}

describe('packagePlanFormStateFromPlan', () => {
  it('tolerates missing home and original_price fields', () => {
    const state = packagePlanFormStateFromPlan({
      ...basePlan,
      original_price: undefined,
      home_features_zh: undefined,
      home_badge_zh: undefined,
      home_highlight: undefined
    })
    expect(state.original_price).toBe('')
    expect(state.home_features_zh).toEqual([])
    expect(state.home_badge_zh).toBe('')
    expect(state.home_highlight).toBe(false)
  })
})

describe('originalPriceIssue', () => {
  it('accepts empty original price', () => {
    const state = packagePlanFormStateFromPlan(basePlan)
    state.original_price = ''
    expect(originalPriceIssue(state)).toBeNull()
  })

  it('rejects non-integer and values below plan price', () => {
    const state = packagePlanFormStateFromPlan(basePlan)
    state.original_price = '2999.5'
    expect(originalPriceIssue(state)).toEqual({ field: 'original_price' })
    state.original_price = '2500'
    expect(originalPriceIssue(state)).toEqual({ field: 'original_price' })
    state.original_price = '3000'
    expect(originalPriceIssue(state)).toBeNull()
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
      home_features_zh: ['功能一', '功能二', '功能三'],
      home_highlight: false
    })
  })

  it('clears feature lists when all lines are removed', () => {
    const snapshot = snapshotFromPlan(basePlan)
    const state = packagePlanFormStateFromPlan(basePlan)
    state.home_features_en = []
    expect(buildPackagePlanPatch(snapshot, state)).toEqual({
      home_features_en: null
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
