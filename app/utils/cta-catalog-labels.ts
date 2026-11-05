import type {
  CtaCatalogType,
  CtaDecisionFormat,
  CtaScenarioId
} from '~/utils/cta-catalog-types'

export type CtaUiFilter = 'all' | 'upload_checkup' | 'vitals_options'

/** Core-aligned defaults for offer_full_test (報告指標不足 → 完整檢測建議). */
export const OFFER_FULL_TEST_DEFAULT_THRESHOLD = 136
export const OFFER_FULL_TEST_DEFAULT_URL = 'https://www.younger.tw/products/body-decode'

const UPLOAD_CHECKUP: ReadonlySet<CtaCatalogType> = new Set([
  'ask_report',
  'offer_checkup',
  'offer_full_test'
])
const VITALS_OPTIONS: ReadonlySet<CtaCatalogType> = new Set(['ask_vitals', 'choose_option'])

export function matchesCtaUiFilter(type: CtaCatalogType, filter: CtaUiFilter): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'upload_checkup') {
    return UPLOAD_CHECKUP.has(type)
  }
  return VITALS_OPTIONS.has(type)
}

/** Whether this CTA exposes editable threshold + url (core fields). */
export function ctaHasThresholdUrlFields(type: CtaCatalogType): boolean {
  return type === 'offer_full_test'
}

export function resolveOfferFullTestThreshold(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : OFFER_FULL_TEST_DEFAULT_THRESHOLD
}

export function resolveOfferFullTestUrl(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || OFFER_FULL_TEST_DEFAULT_URL
}

export function formatDecisionChipKey(format: CtaDecisionFormat): string {
  return `settings.guidance.format.${format}`
}

export function hitUiChipKey(type: CtaCatalogType): string {
  return `settings.guidance.hitUi.${type}`
}

export function scenarioChipKey(id: CtaScenarioId): string {
  return `settings.guidance.scenario.${id}`
}

/** Build a compact systemone-ish JSON preview for the advanced details block. */
export function buildCtaQuestionJsonPreview(item: {
  type: CtaCatalogType
  decision_question: string
  decision_format: CtaDecisionFormat
  format_detail: string | null
}): string {
  const criteria = item.format_detail
    ? item.format_detail.split(',').map(s => s.trim()).filter(Boolean)
    : undefined
  const payload: Record<string, unknown> = {
    type: item.decision_format,
    question: item.decision_question
  }
  if (item.decision_format === 'choice' && criteria?.length) {
    payload.criteria = criteria
  }
  if (item.decision_format === 'score' && item.format_detail) {
    payload.levels = item.format_detail
  }
  return JSON.stringify({ [item.type]: payload }, null, 2)
}
