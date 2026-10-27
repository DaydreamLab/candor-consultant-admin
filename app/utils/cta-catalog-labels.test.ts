import { describe, expect, it } from 'vitest'
import {
  buildCtaQuestionJsonPreview,
  matchesCtaUiFilter
} from './cta-catalog-labels'
import { isHardGateForbidden } from './cta-catalog-types'

describe('cta-catalog-labels', () => {
  it('filters by hit-UI groups', () => {
    expect(matchesCtaUiFilter('ask_report', 'all')).toBe(true)
    expect(matchesCtaUiFilter('ask_report', 'upload_checkup')).toBe(true)
    expect(matchesCtaUiFilter('ask_goal', 'upload_checkup')).toBe(false)
    expect(matchesCtaUiFilter('ask_vitals', 'vitals_options')).toBe(true)
    expect(matchesCtaUiFilter('choose_option', 'vitals_options')).toBe(true)
    expect(matchesCtaUiFilter('none', 'vitals_options')).toBe(false)
  })

  it('builds choice JSON preview for ask_vitals', () => {
    const json = buildCtaQuestionJsonPreview({
      type: 'ask_vitals',
      decision_question: '是否詢問年紀／身高／體重？',
      decision_format: 'choice',
      format_detail: 'age, height, weight'
    })
    expect(JSON.parse(json)).toEqual({
      ask_vitals: {
        type: 'choice',
        question: '是否詢問年紀／身高／體重？',
        criteria: ['age', 'height', 'weight']
      }
    })
  })
})

describe('cta hard gate', () => {
  it('forbids offer_checkup on question_rule', () => {
    expect(isHardGateForbidden('question_rule', 'offer_checkup')).toBe(true)
    expect(isHardGateForbidden('open_dialog', 'offer_checkup')).toBe(false)
    expect(isHardGateForbidden('question_rule', 'choose_option')).toBe(false)
  })
})
