import { describe, expect, it } from 'vitest'
import {
  buildDailyLearningConfirmBody,
  displayNameOr,
  filterPendingDailyLearningDrafts,
  generalDirection,
  generalTechnical,
  parseDailyLearningDraft,
  parseDailyLearningFromWeightSetDetail,
  parseGeneralProposal,
  parsePendingDailyLearningListItem,
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
const ACTOR = '16161616-1616-4161-8161-161616161616'

const weightSetSummary = {
  id: WS,
  version: 'learning-2026-10-21',
  status: 'draft',
  label: '每日學習',
  last_dry_run_passed: null,
  is_daily_learning_draft: true,
  daily_learning_pending: true
}

const baseWeight = {
  id: GP1,
  kind: 'base_weight',
  op: 'bump',
  domain_id: DOM,
  ingredient_id: ING,
  domain_name: '睡眠',
  ingredient_name: '鎂',
  from: 0.6,
  to: 0.65,
  from_base_weight: 0.6,
  to_base_weight: 0.65,
  knowledge_id: K1,
  adjustment_type: 'swap',
  default_agree: true,
  plain_language: '缺鎂相關訊號時，鎂會更常被推薦。',
  plain_language_source: 'ai'
}

const safetyContra = {
  id: SP1,
  kind: 'contraindication_exclude_to_warn',
  contraindication_id: CI,
  ingredient_id: ING,
  condition_code: 'renal_impairment',
  ingredient_name: '鎂',
  condition_name: '腎功能不全',
  from: 'exclude',
  to: 'warn',
  from_severity: 'exclude',
  to_severity: 'warn',
  knowledge_id: K1,
  adjustment_type: 'swap',
  default_agree: false,
  high_risk: true,
  plain_language: '將腎功能不全時鎂的禁忌由排除改為警示，高風險情境仍可能被推薦。',
  plain_language_source: 'ai'
}

describe('parseDailyLearningDraft (strict #75 141c24b)', () => {
  it('parses plain_language and display names', () => {
    const view = parseDailyLearningDraft({
      weight_set: weightSetSummary,
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

    expect(view?.general_proposals[0]).toMatchObject({
      kind: 'base_weight',
      ingredient_name: '鎂',
      domain_name: '睡眠',
      plain_language_source: 'ai'
    })
    expect(view?.safety_proposals[0]).toMatchObject({
      kind: 'contraindication_exclude_to_warn',
      condition_name: '腎功能不全'
    })
    expect(view).not.toHaveProperty('auto_published')
    expect(view?.confirmed_at).toBeNull()
    expect(generalDirection(view!.general_proposals[0]!)).toBe('up')
    expect(generalTechnical(view!.general_proposals[0]!)).not.toHaveProperty('ingredient_id')
  })

  it('accepts null display names', () => {
    const row = parseGeneralProposal({
      ...baseWeight,
      ingredient_name: null,
      domain_name: null,
      plain_language_source: 'template'
    })
    expect(row?.kind).toBe('base_weight')
    if (row?.kind === 'base_weight') {
      expect(row.ingredient_name).toBeNull()
      expect(row.plain_language_source).toBe('template')
    }
    expect(displayNameOr(null, '未命名成分')).toBe('未命名成分')
  })

  it('rejects proposals missing plain_language', () => {
    const { plain_language: _p, ...rest } = baseWeight
    expect(parseGeneralProposal(rest)).toBeNull()
  })

  it('parses interaction and ul_override with names', () => {
    const interaction = parseSafetyProposal({
      id: SP1,
      kind: 'interaction_exclude_to_penalize',
      interaction_id: IX,
      ingredient_a_id: ING,
      ingredient_b_id: ING_B,
      ingredient_a_name: '鎂',
      ingredient_b_name: null,
      from: { effect: 'exclude', penalty: null },
      to: { effect: 'penalize', penalty: 0.05 },
      knowledge_id: K1,
      adjustment_type: 'add',
      default_agree: false,
      high_risk: true,
      plain_language: '交互由排除改為扣分。',
      plain_language_source: 'template'
    })
    expect(interaction?.kind).toBe('interaction_exclude_to_penalize')
    if (interaction?.kind === 'interaction_exclude_to_penalize') {
      expect(interaction.ingredient_b_name).toBeNull()
    }

    const ul = parseSafetyProposal({
      id: '15151515-1515-4151-8151-151515151515',
      kind: 'ul_override',
      ingredient_id: ING,
      ingredient_name: '維生素 D',
      from: 25,
      to: 27.5,
      dose_used: 27,
      knowledge_id: K1,
      adjustment_type: 'dose_change',
      default_agree: false,
      high_risk: true,
      plain_language: '放寬維生素 D 有效 UL。',
      plain_language_source: 'ai'
    })
    expect(ul?.kind).toBe('ul_override')
    if (ul?.kind === 'ul_override') {
      expect(ul.ingredient_name).toBe('維生素 D')
    }

    const signal = parseGeneralProposal({
      id: GP1,
      kind: 'signal_domain_weight',
      op: 'bump_signal',
      biomarker_id: BIO,
      domain_id: DOM,
      biomarker_name: '血清鎂',
      domain_name: '睡眠',
      from: 0.4,
      to: 0.42,
      knowledge_id: K1,
      adjustment_type: 'add',
      default_agree: true,
      plain_language: '血清鎂訊號時睡眠領域更常被推薦。',
      plain_language_source: 'ai'
    })
    expect(signal?.kind).toBe('signal_domain_weight')
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

describe('pending list + detail daily_learning (#76)', () => {
  const pendingRow = { ...weightSetSummary }

  it('filters by daily_learning_pending only', () => {
    expect(parsePendingDailyLearningListItem(pendingRow)).toMatchObject({
      id: WS,
      is_daily_learning_draft: true,
      daily_learning_pending: true
    })
    expect(parsePendingDailyLearningListItem({
      ...pendingRow,
      daily_learning_pending: false
    })).toBeNull()
    expect(filterPendingDailyLearningDrafts([
      pendingRow,
      { ...pendingRow, id: K1, daily_learning_pending: false },
      { id: 'bad' }
    ])).toHaveLength(1)
  })

  it('builds draft view from top-level detail.daily_learning (not config)', () => {
    const view = parseDailyLearningFromWeightSetDetail({
      ...weightSetSummary,
      daily_learning: {
        date: '2026-10-21',
        confirmed_at: '2026-10-21T12:00:00Z',
        confirmed_by: ACTOR,
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
            context_hits: [],
            general_proposals: [baseWeight],
            safety_proposals: [safetyContra],
            weight_changes: [baseWeight],
            contraindication_changes: [safetyContra]
          }
        ],
        general_proposals: [baseWeight],
        safety_proposals: [safetyContra],
        safety_confirmed: [
          {
            proposal_id: SP1,
            confirmed_by: ACTOR,
            role: 'ops',
            confirmed_at: '2026-10-21T13:00:00Z'
          }
        ]
      },
      config: {
        daily_learning: { date: 'should-ignore' }
      }
    })
    expect(view?.weight_set.id).toBe(WS)
    expect(view?.date).toBe('2026-10-21')
    expect(view?.confirmed_at).toBe('2026-10-21T12:00:00Z')
    expect(view?.safety_confirmed).toEqual([
      {
        proposal_id: SP1,
        role: 'ops',
        confirmed_at: '2026-10-21T13:00:00Z'
      }
    ])
    expect(view?.general_proposals[0]?.plain_language).toContain('鎂')
  })

  it('rejects detail without top-level daily_learning', () => {
    expect(parseDailyLearningFromWeightSetDetail({
      ...weightSetSummary,
      daily_learning: null
    })).toBeNull()
    expect(parseDailyLearningFromWeightSetDetail({
      ...weightSetSummary
    })).toBeNull()
  })
})
