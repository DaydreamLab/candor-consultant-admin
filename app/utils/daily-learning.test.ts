import { describe, expect, it } from 'vitest'
import {
  buildDailyLearningConfirmBody,
  parseDailyLearningDraft,
  parseGeneralProposal,
  parseSafetyProposal,
  technicalHasWeightNumbers
} from '~/utils/daily-learning'

describe('parseDailyLearningDraft', () => {
  it('maps weight set, classifications, general and safety proposals', () => {
    const view = parseDailyLearningDraft({
      weight_set: {
        id: '11111111-1111-4111-8111-111111111111',
        version: 'learning-2026-10-21',
        status: 'draft',
        label: '每日學習',
        last_dry_run_passed: null
      },
      date: '2026-10-21',
      proposals: [
        {
          knowledge_id: '22222222-2222-4222-8222-222222222222',
          proposed_classification: 'reusable',
          rationale: '多案相同換品模式',
          decision: 'swap',
          package_plan_code: 'sleep-core'
        }
      ],
      general_proposals: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          knowledge_id: '22222222-2222-4222-8222-222222222222',
          plain_language: '缺鎂相關訊號時，鎂會更常被推薦',
          kind: 'base_weight',
          ingredient_label: '鎂',
          domain_label: 'sleep',
          from_weight: 0.6,
          to_weight: 0.65
        }
      ],
      safety_proposals: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          kind: 'contraindication',
          risk_text: '將某禁忌由排除改為警告，可能讓高風險情境仍被推薦',
          from_effect: 'exclude',
          to_effect: 'warn'
        }
      ],
      auto_published: false
    })

    expect(view?.weight_set.version).toBe('learning-2026-10-21')
    expect(view?.classifications).toHaveLength(1)
    expect(view?.classifications[0]?.proposed_classification).toBe('reusable')
    expect(view?.general_proposals[0]?.plain_language).toContain('鎂')
    expect(view?.general_proposals[0]?.technical).toMatchObject({
      from_weight: 0.6,
      to_weight: 0.65
    })
    expect(view?.safety_proposals[0]?.kind).toBe('contraindication')
    expect(technicalHasWeightNumbers(view!.general_proposals[0]!.technical)).toBe(true)
  })

  it('returns null when weight_set missing', () => {
    expect(parseDailyLearningDraft({ date: '2026-10-21' })).toBeNull()
  })
})

describe('parseGeneralProposal', () => {
  it('requires id and keeps weight numbers only in technical', () => {
    expect(parseGeneralProposal({ plain_language: 'x' })).toBeNull()
    const row = parseGeneralProposal({
      id: '33333333-3333-4333-8333-333333333333',
      plain_language: '白話',
      base_weight_delta: 0.05
    })
    expect(row?.plain_language).toBe('白話')
    expect(row?.technical.base_weight_delta).toBe(0.05)
  })
})

describe('parseSafetyProposal', () => {
  it('defaults kind to unknown when unmarked', () => {
    const row = parseSafetyProposal({
      id: '44444444-4444-4444-8444-444444444444',
      risk_text: '風險'
    })
    expect(row?.kind).toBe('unknown')
  })
})

describe('buildDailyLearningConfirmBody', () => {
  it('locks only reusable／personal_risk and passes accepted ids', () => {
    const body = buildDailyLearningConfirmBody({
      classifications: [
        { knowledge_id: 'a', classification: 'reusable' },
        { knowledge_id: 'b', classification: 'personal_risk' },
        { knowledge_id: 'c', classification: 'pending' }
      ],
      acceptedGeneralProposalIds: ['p1', 'p1', 'p2']
    })
    expect(body.confirmations).toEqual([
      { knowledge_id: 'a', classification: 'reusable', classification_confirmed: true },
      { knowledge_id: 'b', classification: 'personal_risk', classification_confirmed: true }
    ])
    expect(body.accepted_general_proposal_ids).toEqual(['p1', 'p2'])
  })
})
