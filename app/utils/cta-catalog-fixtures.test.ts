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

  it('lists seven seed types without create/delete surface', () => {
    const items = mockListCtaCatalog()
    expect(items.map(i => i.type)).toEqual([
      'ask_report',
      'offer_checkup',
      'ask_vitals',
      'ask_goal',
      'choose_option',
      'offer_recommend',
      'none'
    ])
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
