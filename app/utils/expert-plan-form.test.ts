import { describe, expect, it } from 'vitest'
import {
  buildExpertPlanPatch,
  emptyExpertPlanFormState,
  expertPlanFormIsDirty,
  expertPlanFormStateFromPlan,
  snapshotFromExpertPlan,
  validateExpertPlanForm
} from './expert-plan-form'

describe('expert-plan-form', () => {
  const plan = {
    id: 'ep1',
    code: 'basic',
    package_plan_id: 'pp1',
    package_plan_name_zh: '基礎保養',
    name_zh: '基本方案',
    name_en: 'Basic plan',
    price: 6000,
    active: true,
    sort_order: 10
  }

  it('maps plan into form state including English name', () => {
    const state = expertPlanFormStateFromPlan(plan)
    expect(state.code).toBe('basic')
    expect(state.package_plan_label).toBe('基礎保養')
    expect(state.price).toBe('6000')
    expect(state.name_en).toBe('Basic plan')
    expect(snapshotFromExpertPlan(plan)).toEqual({
      name_zh: '基本方案',
      name_en: 'Basic plan',
      price: 6000,
      active: true,
      sort_order: 10
    })
  })

  it('builds diff-only patch and dirty check including name_en', () => {
    const baseline = snapshotFromExpertPlan(plan)
    const state = expertPlanFormStateFromPlan(plan)
    expect(expertPlanFormIsDirty(baseline, state)).toBe(false)
    state.price = '6500'
    state.name_en = 'Basic plan v2'
    state.sort_order = '2'
    expect(expertPlanFormIsDirty(baseline, state)).toBe(true)
    expect(buildExpertPlanPatch(baseline, state)).toEqual({
      price: 6500,
      name_en: 'Basic plan v2',
      sort_order: 2
    })
  })

  it('requires integer price greater than 0', () => {
    const state = emptyExpertPlanFormState()
    expect(validateExpertPlanForm(state)).toBe('name_zh')
    state.name_zh = '基本方案'
    state.price = '0'
    expect(validateExpertPlanForm(state)).toBe('price')
    state.price = '6000.5'
    expect(validateExpertPlanForm(state)).toBe('price')
    state.price = '6000'
    state.sort_order = '1'
    expect(validateExpertPlanForm(state)).toBeNull()
  })

  it('expert mode only patches active and sort_order', () => {
    const baseline = snapshotFromExpertPlan(plan)
    const state = expertPlanFormStateFromPlan(plan)
    const opts = { allowNamePrice: false }
    state.name_zh = '被改名稱'
    state.name_en = 'Hacked'
    state.price = '9999'
    state.sort_order = '3'
    state.active = false
    expect(expertPlanFormIsDirty(baseline, state, opts)).toBe(true)
    expect(buildExpertPlanPatch(baseline, state, opts)).toEqual({
      active: false,
      sort_order: 3
    })
    expect(validateExpertPlanForm(state, opts)).toBeNull()
  })

  it('expert mode ignores name/price-only edits for dirty', () => {
    const baseline = snapshotFromExpertPlan(plan)
    const state = expertPlanFormStateFromPlan(plan)
    const opts = { allowNamePrice: false }
    state.name_zh = '被改名稱'
    state.name_en = 'Hacked'
    state.price = '9999'
    expect(expertPlanFormIsDirty(baseline, state, opts)).toBe(false)
    expect(buildExpertPlanPatch(baseline, state, opts)).toEqual({})
  })
})
