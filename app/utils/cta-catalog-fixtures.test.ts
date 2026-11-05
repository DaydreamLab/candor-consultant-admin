import { beforeEach, describe, expect, it } from 'vitest'
import {
  mockGetCtaScenarioMatrix,
  mockListCtaCatalog,
  mockPatchCtaCatalogItem,
  mockPatchCtaScenarioMatrix,
  resetCtaCatalogMockStore
} from './cta-catalog-fixtures'

describe('cta-catalog-fixtures mock store', () => {
  beforeEach(() => {
    resetCtaCatalogMockStore()
  })

  it('lists seed types including offer_full_test without create/delete surface', () => {
    const items = mockListCtaCatalog()
    expect(items.map(i => i.type)).toEqual([
      'ask_report',
      'offer_checkup',
      'offer_full_test',
      'ask_vitals',
      'ask_goal',
      'choose_option',
      'offer_recommend',
      'none'
    ])
    const fullTest = items.find(i => i.type === 'offer_full_test')
    expect(fullTest?.threshold).toBe(136)
    expect(fullTest?.url).toBe('https://www.younger.tw/products/body-decode')
    expect(fullTest?.display_name).toContain('完整檢測建議')
  })

  it('patches display_name and syncs scenario_ids into matrix', () => {
    const updated = mockPatchCtaCatalogItem('ask_goal', {
      display_name: '詢問目標（改）',
      scenario_ids: ['open_dialog', 'questionnaire_gap']
    })
    expect(updated?.display_name).toBe('詢問目標（改）')
    const matrix = mockGetCtaScenarioMatrix()
    const gap = matrix.rows.find(r => r.scenario === 'questionnaire_gap')
    expect(gap?.types).toContain('ask_goal')
  })

  it('patches offer_full_test threshold and url (core field names)', () => {
    const updated = mockPatchCtaCatalogItem('offer_full_test', {
      threshold: 120,
      url: 'https://www.younger.tw/products/body-decode?ref=admin'
    })
    expect(updated?.threshold).toBe(120)
    expect(updated?.url).toBe('https://www.younger.tw/products/body-decode?ref=admin')
    expect(mockListCtaCatalog().find(i => i.type === 'offer_full_test')?.threshold).toBe(120)
  })

  it('strips hard-gated offer_checkup from question_rule on matrix patch', () => {
    const next = mockPatchCtaScenarioMatrix({
      rows: [
        {
          scenario: 'question_rule',
          types: ['choose_option', 'offer_checkup']
        }
      ]
    })
    const row = next.rows.find(r => r.scenario === 'question_rule')
    expect(row?.types).toEqual(['choose_option'])
    expect(row?.types).not.toContain('offer_checkup')
  })
})
