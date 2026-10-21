/**
 * Daily learning confirm UI helpers (ADR 0028 / core #75).
 * Field-key fallbacks live in daily-learning-fields.ts — replace that file when #75 schema lands.
 */

import {
  CLASSIFICATION_RATIONALE_KEYS,
  CLASSIFICATION_VALUE_KEYS,
  DOMAIN_LABEL_KEYS,
  FROM_LABEL_KEYS,
  GENERAL_DISPLAY_KEYS,
  GENERAL_KIND_KEYS,
  GENERAL_PLAIN_LANGUAGE_KEYS,
  INGREDIENT_LABEL_KEYS,
  SAFETY_DISPLAY_KEYS,
  SAFETY_KIND_KEYS,
  SAFETY_RISK_TEXT_KEYS,
  TO_LABEL_KEYS
} from '~/utils/daily-learning-fields'

export type DailyLearningClassification = 'pending' | 'reusable' | 'personal_risk'

export type DailyLearningStep
  = 'idle'
    | 'drafted'
    | 'general_confirmed'
    | 'dry_run_done'
    | 'published'

export type DailyLearningWeightSetSummary = {
  id: string
  version: string
  status: string
  label: string | null
  last_dry_run_passed: boolean | null
}

export type DailyLearningClassificationRow = {
  knowledge_id: string
  proposed_classification: DailyLearningClassification
  rationale: string
  decision: string | null
  package_plan_code: string | null
  raw: Record<string, unknown>
}

export type DailyLearningGeneralProposal = {
  id: string
  knowledge_id: string | null
  plain_language: string
  kind: string | null
  ingredient_label: string | null
  domain_label: string | null
  technical: Record<string, unknown>
  raw: Record<string, unknown>
}

export type DailyLearningSafetyKind
  = 'contraindication'
    | 'ul_override'
    | 'interaction'
    | 'unknown'

export type DailyLearningSafetyProposal = {
  id: string
  knowledge_id: string | null
  kind: DailyLearningSafetyKind
  risk_text: string
  from_label: string | null
  to_label: string | null
  technical: Record<string, unknown>
  raw: Record<string, unknown>
}

export type DailyLearningDraftView = {
  weight_set: DailyLearningWeightSetSummary
  date: string
  classifications: DailyLearningClassificationRow[]
  general_proposals: DailyLearningGeneralProposal[]
  safety_proposals: DailyLearningSafetyProposal[]
  auto_published: false
  raw: Record<string, unknown>
}

const CLASSIFICATIONS = new Set<DailyLearningClassification>([
  'pending',
  'reusable',
  'personal_risk'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringOf(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

function uuidOf(value: unknown): string | null {
  return stringOf(value)
}

function firstString(
  row: Record<string, unknown>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value = stringOf(row[key])
    if (value) {
      return value
    }
  }
  return null
}

function classificationOf(value: unknown): DailyLearningClassification | null {
  if (typeof value !== 'string') {
    return null
  }
  return CLASSIFICATIONS.has(value as DailyLearningClassification)
    ? (value as DailyLearningClassification)
    : null
}

function pickTechnical(
  row: Record<string, unknown>,
  exclude: readonly string[]
): Record<string, unknown> {
  const skip = new Set(exclude)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key) || value === undefined) {
      continue
    }
    out[key] = value
  }
  return out
}

/** True if technical payload may expose weight / numeric deltas. */
export function technicalHasWeightNumbers(technical: Record<string, unknown>): boolean {
  const keys = Object.keys(technical)
  if (!keys.length) {
    return false
  }
  const weightish = /weight|delta|ul|penalty|base_weight|signal_domain/i
  return keys.some(key => weightish.test(key))
    || Object.values(technical).some(value => typeof value === 'number')
}

export function parseWeightSetSummary(value: unknown): DailyLearningWeightSetSummary | null {
  if (!isRecord(value)) {
    return null
  }
  const id = uuidOf(value.id)
  const version = stringOf(value.version)
  const status = stringOf(value.status)
  if (!id || !version || !status) {
    return null
  }
  return {
    id,
    version,
    status,
    label: stringOf(value.label),
    last_dry_run_passed: typeof value.last_dry_run_passed === 'boolean'
      ? value.last_dry_run_passed
      : null
  }
}

export function parseClassificationRow(value: unknown): DailyLearningClassificationRow | null {
  if (!isRecord(value)) {
    return null
  }
  const knowledge_id = uuidOf(value.knowledge_id) ?? uuidOf(value.id)
  if (!knowledge_id) {
    return null
  }
  let proposed: DailyLearningClassification = 'pending'
  for (const key of CLASSIFICATION_VALUE_KEYS) {
    const parsed = classificationOf(value[key])
    if (parsed) {
      proposed = parsed
      break
    }
  }
  return {
    knowledge_id,
    proposed_classification: proposed,
    rationale: firstString(value, CLASSIFICATION_RATIONALE_KEYS) ?? '',
    decision: firstString(value, ['decision']),
    package_plan_code: firstString(value, ['package_plan_code']),
    raw: value
  }
}

export function parseGeneralProposal(value: unknown): DailyLearningGeneralProposal | null {
  if (!isRecord(value)) {
    return null
  }
  const id = uuidOf(value.id) ?? uuidOf(value.proposal_id)
  if (!id) {
    return null
  }
  return {
    id,
    knowledge_id: uuidOf(value.knowledge_id),
    plain_language: firstString(value, GENERAL_PLAIN_LANGUAGE_KEYS) ?? '',
    kind: firstString(value, GENERAL_KIND_KEYS),
    ingredient_label: firstString(value, INGREDIENT_LABEL_KEYS),
    domain_label: firstString(value, DOMAIN_LABEL_KEYS),
    technical: pickTechnical(value, GENERAL_DISPLAY_KEYS),
    raw: value
  }
}

function safetyKindOf(value: unknown): DailyLearningSafetyKind {
  const text = stringOf(value)?.toLowerCase() ?? ''
  if (
    text === 'contraindication'
    || text.includes('contra')
    || text.includes('禁忌')
  ) {
    return 'contraindication'
  }
  if (text === 'ul_override' || text.includes('ul') || text.includes('上限')) {
    return 'ul_override'
  }
  if (
    text === 'interaction'
    || text.includes('interact')
    || text.includes('交互')
  ) {
    return 'interaction'
  }
  return 'unknown'
}

export function parseSafetyProposal(value: unknown): DailyLearningSafetyProposal | null {
  if (!isRecord(value)) {
    return null
  }
  const id = uuidOf(value.id) ?? uuidOf(value.proposal_id)
  if (!id) {
    return null
  }
  let kindRaw: unknown
  for (const key of SAFETY_KIND_KEYS) {
    if (value[key] !== undefined && value[key] !== null) {
      kindRaw = value[key]
      break
    }
  }
  return {
    id,
    knowledge_id: uuidOf(value.knowledge_id),
    kind: safetyKindOf(kindRaw),
    risk_text: firstString(value, SAFETY_RISK_TEXT_KEYS) ?? '',
    from_label: firstString(value, FROM_LABEL_KEYS),
    to_label: firstString(value, TO_LABEL_KEYS),
    technical: pickTechnical(value, SAFETY_DISPLAY_KEYS),
    raw: value
  }
}

/**
 * Map draft API payload into UI rows.
 * `proposals` → classification suggestions when present.
 */
export function parseDailyLearningDraft(data: unknown): DailyLearningDraftView | null {
  if (!isRecord(data)) {
    return null
  }
  const weight_set = parseWeightSetSummary(data.weight_set)
  const date = stringOf(data.date)
  if (!weight_set || !date) {
    return null
  }

  const proposalList = Array.isArray(data.proposals) ? data.proposals : []
  const generalList = Array.isArray(data.general_proposals) ? data.general_proposals : []
  const safetyList = Array.isArray(data.safety_proposals) ? data.safety_proposals : []

  const classifications = proposalList
    .map(parseClassificationRow)
    .filter((row): row is DailyLearningClassificationRow => Boolean(row))

  const general_proposals = generalList
    .map(parseGeneralProposal)
    .filter((row): row is DailyLearningGeneralProposal => Boolean(row))

  const safety_proposals = safetyList
    .map(parseSafetyProposal)
    .filter((row): row is DailyLearningSafetyProposal => Boolean(row))

  if (!classifications.length && general_proposals.length) {
    const seen = new Set<string>()
    for (const proposal of general_proposals) {
      if (!proposal.knowledge_id || seen.has(proposal.knowledge_id)) {
        continue
      }
      seen.add(proposal.knowledge_id)
      const raw = proposal.raw
      let proposed: DailyLearningClassification = 'pending'
      for (const key of CLASSIFICATION_VALUE_KEYS) {
        const parsed = classificationOf(raw[key])
        if (parsed) {
          proposed = parsed
          break
        }
      }
      classifications.push({
        knowledge_id: proposal.knowledge_id,
        proposed_classification: proposed,
        rationale: firstString(raw, [
          'classification_rationale',
          ...CLASSIFICATION_RATIONALE_KEYS
        ]) ?? '',
        decision: firstString(raw, ['decision']),
        package_plan_code: firstString(raw, ['package_plan_code']),
        raw
      })
    }
  }

  return {
    weight_set,
    date,
    classifications,
    general_proposals,
    safety_proposals,
    auto_published: false,
    raw: data
  }
}

export function generalProposalsForKnowledge(
  proposals: DailyLearningGeneralProposal[],
  knowledgeId: string
): DailyLearningGeneralProposal[] {
  return proposals.filter(row => row.knowledge_id === knowledgeId)
}

export function orphanGeneralProposals(
  proposals: DailyLearningGeneralProposal[],
  knowledgeIds: Set<string>
): DailyLearningGeneralProposal[] {
  return proposals.filter(row => !row.knowledge_id || !knowledgeIds.has(row.knowledge_id))
}

/** Build confirm body: lock classifications; accept general ids as provided. */
export function buildDailyLearningConfirmBody(input: {
  classifications: Array<{ knowledge_id: string, classification: DailyLearningClassification }>
  acceptedGeneralProposalIds: string[]
}): {
  confirmations: Array<{
    knowledge_id: string
    classification: 'reusable' | 'personal_risk'
    classification_confirmed: true
  }>
  accepted_general_proposal_ids: string[]
} {
  const confirmations = input.classifications
    .filter(row => row.classification === 'reusable' || row.classification === 'personal_risk')
    .map(row => ({
      knowledge_id: row.knowledge_id,
      classification: row.classification as 'reusable' | 'personal_risk',
      classification_confirmed: true as const
    }))

  return {
    confirmations,
    accepted_general_proposal_ids: [...new Set(input.acceptedGeneralProposalIds)]
  }
}

export function formatTechnicalJson(technical: Record<string, unknown>): string {
  try {
    return JSON.stringify(technical, null, 2)
  } catch {
    return ''
  }
}
