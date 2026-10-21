import { describe, expect, it } from 'vitest'
import {
  buildDailyLearningConfirmBody,
  generalDirection,
  generalTechnical,
  parseDailyLearningDraft,
  parseGeneralProposal,
  parseSafetyProposal
} from '~/utils/daily-learning'

const K1 = '22222222-2222-4222-8222-222222222222'
const K2 = '33333333-3333-4333-8333-333333333333'
const WS = '11111111-1111-4111-8111-111111111111'
const CASE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DOM = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ING = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const GP1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const SP1 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const BIO = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const CI = '12121212-1212-4121-8121-121212121212'
const IX = '13131313-1313-4131-8131-131313131313'
const ING_B = '14141414-1414-4141-8141-141414141414'

const baseWeight = {
  id: GP1,
  kind: 'base_weight',
  op: 'bump',
  domain_id: DOM,
  ingredient_id: ING,
  from: 0.6,
  to: 0.65,
  from_base_weight: 0.6,
  to_base_weight: 0.65,
  knowledge_id: K1,
  adjustment_type: 'swap',
  default_agree: true
}

const safetyContra = {
  id: SP1,
  kind: 'contraindication_exclude_to_warn',
  contraindication_id: CI,
  ingredient_id: ING,
  condition_code: 'renal_impairment',
  from: 'exclude',
  to: 'warn',
  from_severity: 'exclude',
  to_severity: 'warn',
  knowledge_id: K1,
  adjustment_type: 'swap',
  default_agree: false,
  high_risk: true
}

describe('parseDailyLearningDraft (strict #75)', () => {
  it('parses full draft with discriminators', () => {
    const view = parseDailyLearningDraft({
      weight_set: {
        id: WS,
        version: 'learning-2026-10-21',
        status: 'draft',
        label: '每日學習',
        last_dry_run_passed: null
      },
      date: '2026-10-21',
      proposals: [
        {
          knowledge_id: K1,
          expert_case_review_id: CASE,
          decision: 'adjust',
          adjustment_type: 'swap',
          proposed_classification: 'reusable',
          classification_rationale: '多案相同換品',
          classification_source: 'llm',
          needs_human: false,
          context_hits: [
            { knowledge_id: K2, reason: '相似換品', similarity: 0.81 }
          ],
          general_proposals: [baseWeight],
          safety_proposals: [safetyContra],
          weight_changes: [baseWeight],
          contraindication_changes: [safetyContra]
        }
      ],
      general_proposals: [baseWeight],
      safety_proposals: [safetyContra],
      auto_published: false
    })

    expect(view?.proposals).toHaveLength(1)
    expect(view?.proposals[0]?.proposed_classification).toBe('reusable')
    expect(view?.general_proposals[0]?.kind).toBe('base_weight')
    expect(view?.safety_proposals[0]?.kind).toBe('contraindication_exclude_to_warn')
    expect(generalDirection(view!.general_proposals[0]!)).toBe('up')
    expect(generalTechnical(view!.general_proposals[0]!)).toEqual({
      kind: 'base_weight',
      op: 'bump',
      from: 0.6,
      to: 0.65,
      from_base_weight: 0.6,
      to_base_weight: 0.65
    })
    expect(generalTechnical(view!.general_proposals[0]!)).not.toHaveProperty('ingredient_id')
  })

  it('rejects unknown alternate keys masquerading as proposals', () => {
    expect(parseGeneralProposal({
      id: GP1,
      kind: 'base_weight',
      plain_language: 'legacy',
      default_agree: true
    })).toBeNull()
  })

  it('rejects safety with default_agree true', () => {
    expect(parseSafetyProposal({
      ...safetyContra,
      default_agree: true
    })).toBeNull()
  })

  it('parses interaction and ul_override kinds', () => {
    const interaction = parseSafetyProposal({
      id: SP1,
      kind: 'interaction_exclude_to_penalize',
      interaction_id: IX,
      ingredient_a_id: ING,
      ingredient_b_id: ING_B,
      from: { effect: 'exclude', penalty: null },
      to: { effect: 'penalize', penalty: 0.05 },
      knowledge_id: K1,
      adjustment_type: 'add',
      default_agree: false,
      high_risk: true
    })
    expect(interaction?.kind).toBe('interaction_exclude_to_penalize')

    const ul = parseSafetyProposal({
      id: '15151515-1515-4151-8151-151515151515',
      kind: 'ul_override',
      ingredient_id: ING,
      from: 25,
      to: 27.5,
      dose_used: 27,
      knowledge_id: K1,
      adjustment_type: 'dose_change',
      default_agree: false,
      high_risk: true
    })
    expect(ul?.kind).toBe('ul_override')

    const signal = parseGeneralProposal({
      id: GP1,
      kind: 'signal_domain_weight',
      op: 'bump_signal',
      biomarker_id: BIO,
      domain_id: DOM,
      from: 0.4,
      to: 0.42,
      knowledge_id: K1,
      adjustment_type: 'add',
      default_agree: true
    })
    expect(signal?.kind).toBe('signal_domain_weight')
    expect(generalDirection(signal!)).toBe('up')
  })
})

describe('buildDailyLearningConfirmBody', () => {
  it('locks only reusable／personal_risk', () => {
    const body = buildDailyLearningConfirmBody({
      classifications: [
        { knowledge_id: 'a', classification: 'reusable' },
        { knowledge_id: 'b', classification: 'personal_risk' },
        { knowledge_id: 'c', classification: 'pending' }
      ],
      acceptedGeneralProposalIds: ['p1', 'p1']
    })
    expect(body.confirmations).toHaveLength(2)
    expect(body.accepted_general_proposal_ids).toEqual(['p1'])
  })
})
