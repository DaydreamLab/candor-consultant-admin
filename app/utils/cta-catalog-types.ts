/** CTA catalog types — aligned with systemone／reply_actions seed set (no inventing new types). */

export const CTA_CATALOG_TYPES = [
  'ask_report',
  'offer_checkup',
  'ask_vitals',
  'ask_goal',
  'choose_option',
  'offer_recommend',
  'none'
] as const

export type CtaCatalogType = (typeof CTA_CATALOG_TYPES)[number]

export const CTA_DECISION_FORMATS = ['noul', 'choice', 'score'] as const

export type CtaDecisionFormat = (typeof CTA_DECISION_FORMATS)[number]

export const CTA_SCENARIO_IDS = [
  'open_dialog',
  'questionnaire_gap',
  'lab_post_answer',
  'question_rule'
] as const

export type CtaScenarioId = (typeof CTA_SCENARIO_IDS)[number]

/** Product hard gate: question_rule must never include offer_checkup. */
export const CTA_HARD_GATE_FORBIDDEN: ReadonlyArray<{
  scenario: CtaScenarioId
  type: CtaCatalogType
}> = [
  { scenario: 'question_rule', type: 'offer_checkup' }
]

export type CtaCatalogItem = {
  type: CtaCatalogType
  display_name: string
  decision_question: string
  decision_format: CtaDecisionFormat
  /** choice criteria / score levels / optional noul note */
  format_detail: string | null
  reply_action_type: CtaCatalogType
  reply_action_hint: string
  scenario_ids: CtaScenarioId[]
  is_sample?: boolean
  updated_at?: string | null
}

export type CtaCatalogPatch = {
  display_name?: string
  decision_question?: string
  decision_format?: CtaDecisionFormat
  format_detail?: string | null
  reply_action_type?: CtaCatalogType
  reply_action_hint?: string
  scenario_ids?: CtaScenarioId[]
}

export type CtaScenarioMatrixRow = {
  scenario: CtaScenarioId
  types: CtaCatalogType[]
  /** Optional per-cell notes shown in matrix (e.g. profile / lab_report / 合併呈現) */
  notes?: Partial<Record<CtaCatalogType, string>>
}

export type CtaScenarioMatrix = {
  rows: CtaScenarioMatrixRow[]
  updated_at?: string | null
}

export function isCtaCatalogType(value: unknown): value is CtaCatalogType {
  return typeof value === 'string' && (CTA_CATALOG_TYPES as readonly string[]).includes(value)
}

export function isCtaDecisionFormat(value: unknown): value is CtaDecisionFormat {
  return typeof value === 'string' && (CTA_DECISION_FORMATS as readonly string[]).includes(value)
}

export function isCtaScenarioId(value: unknown): value is CtaScenarioId {
  return typeof value === 'string' && (CTA_SCENARIO_IDS as readonly string[]).includes(value)
}

export function isHardGateForbidden(scenario: CtaScenarioId, type: CtaCatalogType): boolean {
  return CTA_HARD_GATE_FORBIDDEN.some(g => g.scenario === scenario && g.type === type)
}
