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
    name_zh: '專家方案（基礎保養）',
    name_en: 'Expert plan (basic)',
    price: 6000,
    active: true,
    sort_order: 10
  }

  it('maps plan into form state and snapshot', () => {
    const state = expertPlanFormStateFromPlan(plan)
    expect(state.code).toBe('basic')
    expect(state.package_plan_label).toBe('基礎保養')
    expect(state.price).toBe('6000')
    expect(snapshotFromExpertPlan(plan)).toEqual({
      name_zh: '專家方案（基礎保養）',
      name_en: 'Expert plan (basic)',
      price: 6000,
      active: true,
      sort_order: 10
    })
  })

  it('builds diff-only patch and dirty check', () => {
    const baseline = snapshotFromExpertPlan(plan)
    const state = expertPlanFormStateFromPlan(plan)
    expect(expertPlanFormIsDirty(baseline, state)).toBe(false)
    state.price = '6500'
    state.active = false
    expect(expertPlanFormIsDirty(baseline, state)).toBe(true)
    expect(buildExpertPlanPatch(baseline, state)).toEqual({
      price: 6500,
      active: false
    })
  })

  it('validates required name and integer price', () => {
    const state = emptyExpertPlanFormState()
    expect(validateExpertPlanForm(state)).toBe('name_zh')
    state.name_zh = '專家方案（基礎保養）'
    state.price = '0'
    expect(validateExpertPlanForm(state)).toBe('price')
    state.price = '6000.5'
    expect(validateExpertPlanForm(state)).toBe('price')
    state.price = '6000'
    state.sort_order = 'x'
    expect(validateExpertPlanForm(state)).toBe('sort_order')
    state.sort_order = '1'
    expect(validateExpertPlanForm(state)).toBeNull()
  })
})
