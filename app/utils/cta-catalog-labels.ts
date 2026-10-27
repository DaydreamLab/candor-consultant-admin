import type {
  CtaCatalogType,
  CtaDecisionFormat,
  CtaScenarioId
} from '~/utils/cta-catalog-types'

export type CtaUiFilter = 'all' | 'upload_checkup' | 'vitals_options'

const UPLOAD_CHECKUP: ReadonlySet<CtaCatalogType> = new Set(['ask_report', 'offer_checkup'])
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

export function formatDecisionChipKey(format: CtaDecisionFormat): string {
  return `settings.ctaCatalog.format.${format}`
}

export function hitUiChipKey(type: CtaCatalogType): string {
  return `settings.ctaCatalog.hitUi.${type}`
}

export function scenarioChipKey(id: CtaScenarioId): string {
  return `settings.ctaCatalog.scenario.${id}`
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
