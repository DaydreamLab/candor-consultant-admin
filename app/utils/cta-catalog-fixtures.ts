import type {
  CtaCatalogItem,
  CtaCatalogPatch,
  CtaCatalogType,
  CtaScenarioId,
  CtaScenarioMatrix
} from '~/utils/cta-catalog-types'
import { isHardGateForbidden } from '~/utils/cta-catalog-types'

/** Seed fixtures for mock mode — matches design seed set; not new product rules. */
export const CTA_CATALOG_FIXTURE_ITEMS: CtaCatalogItem[] = [
  {
    type: 'ask_report',
    display_name: '詢問報告',
    decision_question: '是否詢問報告？',
    decision_format: 'noul',
    format_detail: null,
    reply_action_type: 'ask_report',
    reply_action_hint: '上傳報告（含拍照）',
    scenario_ids: ['open_dialog', 'lab_post_answer'],
    is_sample: true,
    updated_at: '2026-10-27T12:00:00.000Z'
  },
  {
    type: 'offer_checkup',
    display_name: '詢問檢查',
    decision_question: '是否詢問檢查？',
    decision_format: 'noul',
    format_detail: null,
    reply_action_type: 'offer_checkup',
    reply_action_hint: '外連檢查',
    scenario_ids: ['open_dialog', 'lab_post_answer'],
    is_sample: true,
    updated_at: '2026-10-27T12:00:00.000Z'
  },
  {
    type: 'ask_vitals',
    display_name: '詢問身體數據',
    decision_question: '是否詢問年紀／身高／體重？（決策直接選欄）',
    decision_format: 'choice',
    format_detail: 'age, height, weight',
    reply_action_type: 'ask_vitals',
    reply_action_hint: '數字輸入卡；fields[]＝本輪選定單一欄',
    scenario_ids: ['open_dialog', 'questionnaire_gap'],
    is_sample: true,
    updated_at: '2026-10-27T12:00:00.000Z'
  },
  {
    type: 'ask_goal',
    display_name: '詢問目標',
    decision_question: '是否詢問目標／改善方向？',
    decision_format: 'noul',
    format_detail: null,
    reply_action_type: 'ask_goal',
    reply_action_hint: '目標 chips',
    scenario_ids: ['open_dialog'],
    is_sample: true,
    updated_at: '2026-10-27T12:00:00.000Z'
  },
  {
    type: 'choose_option',
    display_name: '選項對答',
    decision_question: '是否提供選項對答 CTA？',
    decision_format: 'noul',
    format_detail: null,
    reply_action_type: 'choose_option',
    reply_action_hint: 'chips（kind／mode／confirm）',
    scenario_ids: ['open_dialog', 'questionnaire_gap', 'question_rule'],
    is_sample: true,
    updated_at: '2026-10-27T12:00:00.000Z'
  },
  {
    type: 'offer_recommend',
    display_name: '推薦／專家下一站',
    decision_question: '是否可進入推薦／專家下一站？',
    decision_format: 'noul',
    format_detail: null,
    reply_action_type: 'offer_recommend',
    reply_action_hint: '查看推薦／提交專家',
    scenario_ids: ['open_dialog'],
    is_sample: true,
    updated_at: '2026-10-27T12:00:00.000Z'
  },
  {
    type: 'none',
    display_name: '不出 CTA',
    decision_question: '（否／未知）',
    decision_format: 'noul',
    format_detail: null,
    reply_action_type: 'none',
    reply_action_hint: '無',
    scenario_ids: ['open_dialog'],
    is_sample: true,
    updated_at: '2026-10-27T12:00:00.000Z'
  }
]

export const CTA_SCENARIO_MATRIX_FIXTURE: CtaScenarioMatrix = {
  rows: [
    {
      scenario: 'open_dialog',
      types: [
        'ask_report',
        'offer_checkup',
        'ask_goal',
        'offer_recommend',
        'ask_vitals',
        'choose_option',
        'none'
      ]
    },
    {
      scenario: 'questionnaire_gap',
      types: ['ask_vitals', 'choose_option'],
      notes: { choose_option: 'profile' }
    },
    {
      scenario: 'lab_post_answer',
      types: ['ask_report', 'offer_checkup'],
      notes: { choose_option: '合併呈現' }
    },
    {
      scenario: 'question_rule',
      types: ['choose_option'],
      notes: { choose_option: 'lab_report' }
    }
  ],
  updated_at: '2026-10-27T12:00:00.000Z'
}

/** Mutable in-memory store for mock PATCH sessions (module-level; resets on reload). */
let mockItems: CtaCatalogItem[] = cloneItems(CTA_CATALOG_FIXTURE_ITEMS)
let mockMatrix: CtaScenarioMatrix = cloneMatrix(CTA_SCENARIO_MATRIX_FIXTURE)

export function resetCtaCatalogMockStore() {
  mockItems = cloneItems(CTA_CATALOG_FIXTURE_ITEMS)
  mockMatrix = cloneMatrix(CTA_SCENARIO_MATRIX_FIXTURE)
}

export function mockListCtaCatalog(): CtaCatalogItem[] {
  return cloneItems(mockItems)
}

export function mockGetCtaCatalogItem(type: CtaCatalogType): CtaCatalogItem | null {
  const row = mockItems.find(item => item.type === type)
  return row ? { ...row, scenario_ids: [...row.scenario_ids] } : null
}

export function mockPatchCtaCatalogItem(
  type: CtaCatalogType,
  patch: CtaCatalogPatch
): CtaCatalogItem | null {
  const index = mockItems.findIndex(item => item.type === type)
  if (index < 0) {
    return null
  }
  const current = mockItems[index]!
  const next: CtaCatalogItem = {
    ...current,
    display_name: patch.display_name ?? current.display_name,
    decision_question: patch.decision_question ?? current.decision_question,
    decision_format: patch.decision_format ?? current.decision_format,
    format_detail: patch.format_detail !== undefined ? patch.format_detail : current.format_detail,
    reply_action_type: patch.reply_action_type ?? current.reply_action_type,
    reply_action_hint: patch.reply_action_hint ?? current.reply_action_hint,
    scenario_ids: patch.scenario_ids ? [...patch.scenario_ids] : [...current.scenario_ids],
    updated_at: new Date().toISOString()
  }
  mockItems[index] = next

  if (patch.scenario_ids) {
    syncMatrixFromItemScenarios(type, patch.scenario_ids)
  }

  return { ...next, scenario_ids: [...next.scenario_ids] }
}

export function mockGetCtaScenarioMatrix(): CtaScenarioMatrix {
  return cloneMatrix(mockMatrix)
}

export function mockPatchCtaScenarioMatrix(matrix: CtaScenarioMatrix): CtaScenarioMatrix {
  const sanitized = sanitizeMatrix(matrix)
  mockMatrix = sanitized
  syncItemsFromMatrix(sanitized)
  return cloneMatrix(mockMatrix)
}

function syncMatrixFromItemScenarios(type: CtaCatalogType, scenarioIds: CtaScenarioId[]) {
  mockMatrix = {
    ...mockMatrix,
    rows: mockMatrix.rows.map((row) => {
      const include = scenarioIds.includes(row.scenario) && !isHardGateForbidden(row.scenario, type)
      const types = include
        ? Array.from(new Set([...row.types, type]))
        : row.types.filter(t => t !== type)
      return { ...row, types }
    }),
    updated_at: new Date().toISOString()
  }
}

function syncItemsFromMatrix(matrix: CtaScenarioMatrix) {
  mockItems = mockItems.map((item) => {
    const scenario_ids = matrix.rows
      .filter(row => row.types.includes(item.type))
      .map(row => row.scenario)
    return { ...item, scenario_ids, updated_at: new Date().toISOString() }
  })
}

function sanitizeMatrix(matrix: CtaScenarioMatrix): CtaScenarioMatrix {
  return {
    updated_at: new Date().toISOString(),
    rows: matrix.rows.map(row => ({
      scenario: row.scenario,
      notes: row.notes ? { ...row.notes } : undefined,
      types: row.types.filter(type => !isHardGateForbidden(row.scenario, type))
    }))
  }
}

function cloneItems(items: CtaCatalogItem[]): CtaCatalogItem[] {
  return items.map(item => ({ ...item, scenario_ids: [...item.scenario_ids] }))
}

function cloneMatrix(matrix: CtaScenarioMatrix): CtaScenarioMatrix {
  return {
    updated_at: matrix.updated_at ?? null,
    rows: matrix.rows.map(row => ({
      scenario: row.scenario,
      types: [...row.types],
      notes: row.notes ? { ...row.notes } : undefined
    }))
  }
}
