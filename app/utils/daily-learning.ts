/**
 * Strict parsers + display helpers for daily-learning (#75 / 681d6eb).
 * No alternate-key fallbacks — invalid payloads return null.
 */

import type {
  AdminWeightSetDailyLearning,
  DailyLearningAdjustmentType,
  DailyLearningClassificationSource,
  DailyLearningDecision,
  DailyLearningDisplayName,
  DailyLearningDraftResult,
  DailyLearningGeneralProposal,
  DailyLearningGeneralProposalAddEdge,
  DailyLearningGeneralProposalBaseWeight,
  DailyLearningGeneralProposalSignalDomainWeight,
  DailyLearningOperatorRole,
  DailyLearningPendingListItem,
  DailyLearningPlainLanguageSource,
  DailyLearningProposedClassification,
  DailyLearningRowProposal,
  DailyLearningSafetyConfirmedEntry,
  DailyLearningSafetyProposal,
  DailyLearningSafetyProposalContraindication,
  DailyLearningSafetyProposalInteraction,
  DailyLearningSafetyProposalUlOverride,
  DailyLearningWeightSetSummary
} from '~/types/daily-learning'

const ADJUSTMENT_TYPES = new Set<DailyLearningAdjustmentType>([
  'swap',
  'add',
  'remove',
  'dose_change'
])

const CLASSIFICATIONS = new Set<DailyLearningProposedClassification>([
  'reusable',
  'personal_risk',
  'pending'
])

const SOURCES = new Set<DailyLearningClassificationSource>([
  'llm',
  'fallback',
  'deterministic_gate'
])

const DECISIONS = new Set<DailyLearningDecision>([
  'approve',
  'reject',
  'adjust'
])

const PLAIN_SOURCES = new Set<DailyLearningPlainLanguageSource>([
  'ai',
  'template'
])

const OPERATOR_ROLES = new Set<DailyLearningOperatorRole>([
  'expert',
  'ops',
  'admin'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Required nullable display name: string or null; empty string → null. */
function asDisplayName(value: unknown): DailyLearningDisplayName | undefined {
  if (value === null) {
    return null
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed || null
}

function asPlainLanguage(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asPlainLanguageSource(value: unknown): DailyLearningPlainLanguageSource | null {
  return typeof value === 'string'
    && PLAIN_SOURCES.has(value as DailyLearningPlainLanguageSource)
    ? (value as DailyLearningPlainLanguageSource)
    : null
}

/** Expert-facing label; never UUID. */
export function displayNameOr(
  value: DailyLearningDisplayName,
  fallback: string
): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return fallback
}

function asUuid(value: unknown): string | null {
  return asString(value)
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asNumberOrNull(value: unknown): number | null | undefined {
  if (value === null) {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return undefined
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asAdjustmentType(value: unknown): DailyLearningAdjustmentType | null {
  return typeof value === 'string' && ADJUSTMENT_TYPES.has(value as DailyLearningAdjustmentType)
    ? (value as DailyLearningAdjustmentType)
    : null
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  return undefined
}

export function parseWeightSetSummary(value: unknown): DailyLearningWeightSetSummary | null {
  if (!isRecord(value)) {
    return null
  }
  const id = asUuid(value.id)
  const version = asString(value.version)
  const status = asString(value.status)
  const is_daily_learning_draft = asBoolean(value.is_daily_learning_draft)
  const daily_learning_pending = asBoolean(value.daily_learning_pending)
  if (!id || !version || !status
    || is_daily_learning_draft === null || daily_learning_pending === null) {
    return null
  }
  const published_at = asNullableString(value.published_at)
  const created_at = asNullableString(value.created_at)
  return {
    id,
    version,
    status,
    label: typeof value.label === 'string' ? value.label : null,
    published_at: published_at === undefined ? null : published_at,
    last_dry_run_passed: typeof value.last_dry_run_passed === 'boolean'
      ? value.last_dry_run_passed
      : null,
    created_at: created_at === undefined ? null : created_at,
    is_daily_learning_draft,
    daily_learning_pending
  }
}

export function parseGeneralProposal(value: unknown): DailyLearningGeneralProposal | null {
  if (!isRecord(value)) {
    return null
  }
  const id = asUuid(value.id)
  const knowledge_id = asUuid(value.knowledge_id)
  const adjustment_type = asAdjustmentType(value.adjustment_type)
  const plain_language = asPlainLanguage(value.plain_language)
  const plain_language_source = asPlainLanguageSource(value.plain_language_source)
  if (!id || !knowledge_id || !adjustment_type || value.default_agree !== true
    || plain_language === null || !plain_language_source) {
    return null
  }

  if (value.kind === 'base_weight') {
    if (value.op !== 'bump') {
      return null
    }
    const domain_id = asUuid(value.domain_id)
    const ingredient_id = asUuid(value.ingredient_id)
    const domain_name = asDisplayName(value.domain_name)
    const ingredient_name = asDisplayName(value.ingredient_name)
    const from = asNumber(value.from)
    const to = asNumber(value.to)
    const from_base_weight = asNumber(value.from_base_weight)
    const to_base_weight = asNumber(value.to_base_weight)
    if (!domain_id || !ingredient_id || domain_name === undefined || ingredient_name === undefined
      || from === null || to === null
      || from_base_weight === null || to_base_weight === null) {
      return null
    }
    const row: DailyLearningGeneralProposalBaseWeight = {
      id,
      kind: 'base_weight',
      op: 'bump',
      domain_id,
      ingredient_id,
      domain_name,
      ingredient_name,
      from,
      to,
      from_base_weight,
      to_base_weight,
      knowledge_id,
      adjustment_type,
      default_agree: true,
      plain_language,
      plain_language_source
    }
    return row
  }

  if (value.kind === 'add_edge') {
    if (value.op !== 'add_edge' || value.direction !== 'deficit' || value.evidence_level !== 'C') {
      return null
    }
    const domain_id = asUuid(value.domain_id)
    const ingredient_id = asUuid(value.ingredient_id)
    const domain_name = asDisplayName(value.domain_name)
    const ingredient_name = asDisplayName(value.ingredient_name)
    const from = asNumberOrNull(value.from)
    const to = asNumber(value.to)
    const from_base_weight = asNumberOrNull(value.from_base_weight)
    const to_base_weight = asNumber(value.to_base_weight)
    if (!domain_id || !ingredient_id || domain_name === undefined || ingredient_name === undefined
      || from === undefined || to === null
      || from_base_weight === undefined || to_base_weight === null) {
      return null
    }
    const row: DailyLearningGeneralProposalAddEdge = {
      id,
      kind: 'add_edge',
      op: 'add_edge',
      domain_id,
      ingredient_id,
      domain_name,
      ingredient_name,
      from,
      to,
      from_base_weight,
      to_base_weight,
      direction: 'deficit',
      evidence_level: 'C',
      knowledge_id,
      adjustment_type,
      default_agree: true,
      plain_language,
      plain_language_source
    }
    return row
  }

  if (value.kind === 'signal_domain_weight') {
    if (value.op !== 'bump_signal') {
      return null
    }
    const biomarker_id = asUuid(value.biomarker_id)
    const domain_id = asUuid(value.domain_id)
    const biomarker_name = asDisplayName(value.biomarker_name)
    const domain_name = asDisplayName(value.domain_name)
    const from = asNumber(value.from)
    const to = asNumber(value.to)
    if (!biomarker_id || !domain_id || biomarker_name === undefined || domain_name === undefined
      || from === null || to === null) {
      return null
    }
    const row: DailyLearningGeneralProposalSignalDomainWeight = {
      id,
      kind: 'signal_domain_weight',
      op: 'bump_signal',
      biomarker_id,
      domain_id,
      biomarker_name,
      domain_name,
      from,
      to,
      knowledge_id,
      adjustment_type,
      default_agree: true,
      plain_language,
      plain_language_source
    }
    return row
  }

  return null
}

export function parseSafetyProposal(value: unknown): DailyLearningSafetyProposal | null {
  if (!isRecord(value)) {
    return null
  }
  const id = asUuid(value.id)
  const knowledge_id = asUuid(value.knowledge_id)
  const adjustment_type = asAdjustmentType(value.adjustment_type)
  const plain_language = asPlainLanguage(value.plain_language)
  const plain_language_source = asPlainLanguageSource(value.plain_language_source)
  if (!id || !knowledge_id || !adjustment_type
    || value.default_agree !== false || value.high_risk !== true
    || plain_language === null || !plain_language_source) {
    return null
  }

  if (value.kind === 'contraindication_exclude_to_warn') {
    const contraindication_id = asUuid(value.contraindication_id)
    const ingredient_id = asUuid(value.ingredient_id)
    const condition_code = asString(value.condition_code)
    const ingredient_name = asDisplayName(value.ingredient_name)
    const condition_name = asDisplayName(value.condition_name)
    if (!contraindication_id || !ingredient_id || !condition_code
      || ingredient_name === undefined || condition_name === undefined
      || value.from !== 'exclude' || value.to !== 'warn'
      || value.from_severity !== 'exclude' || value.to_severity !== 'warn') {
      return null
    }
    const row: DailyLearningSafetyProposalContraindication = {
      id,
      kind: 'contraindication_exclude_to_warn',
      contraindication_id,
      ingredient_id,
      condition_code,
      ingredient_name,
      condition_name,
      from: 'exclude',
      to: 'warn',
      from_severity: 'exclude',
      to_severity: 'warn',
      knowledge_id,
      adjustment_type,
      default_agree: false,
      high_risk: true,
      plain_language,
      plain_language_source
    }
    return row
  }

  if (value.kind === 'interaction_exclude_to_penalize') {
    const interaction_id = asUuid(value.interaction_id)
    const ingredient_a_id = asUuid(value.ingredient_a_id)
    const ingredient_b_id = asUuid(value.ingredient_b_id)
    const ingredient_a_name = asDisplayName(value.ingredient_a_name)
    const ingredient_b_name = asDisplayName(value.ingredient_b_name)
    if (!interaction_id || !ingredient_a_id || !ingredient_b_id
      || ingredient_a_name === undefined || ingredient_b_name === undefined
      || !isRecord(value.from) || !isRecord(value.to)
      || value.from.effect !== 'exclude'
      || value.to.effect !== 'penalize') {
      return null
    }
    let fromPenalty: number | null
    if (value.from.penalty === null) {
      fromPenalty = null
    } else {
      const parsedPenalty = asNumber(value.from.penalty)
      if (parsedPenalty === null) {
        return null
      }
      fromPenalty = parsedPenalty
    }
    const toPenalty = asNumber(value.to.penalty)
    if (toPenalty === null) {
      return null
    }
    const row: DailyLearningSafetyProposalInteraction = {
      id,
      kind: 'interaction_exclude_to_penalize',
      interaction_id,
      ingredient_a_id,
      ingredient_b_id,
      ingredient_a_name,
      ingredient_b_name,
      from: { effect: 'exclude', penalty: fromPenalty },
      to: { effect: 'penalize', penalty: toPenalty },
      knowledge_id,
      adjustment_type,
      default_agree: false,
      high_risk: true,
      plain_language,
      plain_language_source
    }
    return row
  }

  if (value.kind === 'ul_override') {
    const ingredient_id = asUuid(value.ingredient_id)
    const ingredient_name = asDisplayName(value.ingredient_name)
    const from = asNumberOrNull(value.from)
    const to = asNumber(value.to)
    const dose_used = asNumber(value.dose_used)
    if (!ingredient_id || ingredient_name === undefined
      || from === undefined || to === null || dose_used === null) {
      return null
    }
    const row: DailyLearningSafetyProposalUlOverride = {
      id,
      kind: 'ul_override',
      ingredient_id,
      ingredient_name,
      from,
      to,
      dose_used,
      knowledge_id,
      adjustment_type,
      default_agree: false,
      high_risk: true,
      plain_language,
      plain_language_source
    }
    return row
  }

  return null
}

function parseContextHit(value: unknown) {
  if (!isRecord(value)) {
    return null
  }
  const knowledge_id = asUuid(value.knowledge_id)
  const reason = asString(value.reason)
  const similarity = asNumber(value.similarity)
  if (!knowledge_id || !reason || similarity === null) {
    return null
  }
  return { knowledge_id, reason, similarity }
}

export function parseRowProposal(value: unknown): DailyLearningRowProposal | null {
  if (!isRecord(value)) {
    return null
  }
  const knowledge_id = asUuid(value.knowledge_id)
  const expert_case_review_id = asUuid(value.expert_case_review_id)
  const decision = typeof value.decision === 'string'
    && DECISIONS.has(value.decision as DailyLearningDecision)
    ? (value.decision as DailyLearningDecision)
    : null
  const proposed_classification = typeof value.proposed_classification === 'string'
    && CLASSIFICATIONS.has(value.proposed_classification as DailyLearningProposedClassification)
    ? (value.proposed_classification as DailyLearningProposedClassification)
    : null
  const classification_rationale = typeof value.classification_rationale === 'string'
    ? value.classification_rationale
    : null
  const classification_source = typeof value.classification_source === 'string'
    && SOURCES.has(value.classification_source as DailyLearningClassificationSource)
    ? (value.classification_source as DailyLearningClassificationSource)
    : null
  const needs_human = asBoolean(value.needs_human)
  if (!knowledge_id || !expert_case_review_id || !decision || !proposed_classification
    || classification_rationale === null || !classification_source || needs_human === null
    || !Array.isArray(value.context_hits)
    || !Array.isArray(value.general_proposals)
    || !Array.isArray(value.safety_proposals)
    || !Array.isArray(value.weight_changes)
    || !Array.isArray(value.contraindication_changes)) {
    return null
  }

  let adjustment_type: DailyLearningAdjustmentType | null = null
  if (value.adjustment_type !== null && value.adjustment_type !== undefined) {
    adjustment_type = asAdjustmentType(value.adjustment_type)
    if (!adjustment_type) {
      return null
    }
  }

  const context_hits = []
  for (const hit of value.context_hits) {
    const parsed = parseContextHit(hit)
    if (!parsed) {
      return null
    }
    context_hits.push(parsed)
  }

  const general_proposals: DailyLearningGeneralProposal[] = []
  for (const item of value.general_proposals) {
    const parsed = parseGeneralProposal(item)
    if (!parsed) {
      return null
    }
    general_proposals.push(parsed)
  }

  const safety_proposals: DailyLearningSafetyProposal[] = []
  for (const item of value.safety_proposals) {
    const parsed = parseSafetyProposal(item)
    if (!parsed) {
      return null
    }
    safety_proposals.push(parsed)
  }

  const weight_changes: Array<
    DailyLearningGeneralProposalBaseWeight | DailyLearningGeneralProposalAddEdge
  > = []
  for (const item of value.weight_changes) {
    const parsed = parseGeneralProposal(item)
    if (!parsed || (parsed.kind !== 'base_weight' && parsed.kind !== 'add_edge')) {
      return null
    }
    weight_changes.push(parsed)
  }

  const contraindication_changes: DailyLearningSafetyProposalContraindication[] = []
  for (const item of value.contraindication_changes) {
    const parsed = parseSafetyProposal(item)
    if (!parsed || parsed.kind !== 'contraindication_exclude_to_warn') {
      return null
    }
    contraindication_changes.push(parsed)
  }

  return {
    knowledge_id,
    expert_case_review_id,
    decision,
    adjustment_type,
    proposed_classification,
    classification_rationale,
    classification_source,
    needs_human,
    context_hits,
    general_proposals,
    safety_proposals,
    weight_changes,
    contraindication_changes
  }
}

function parseObjectRecordArray(value: unknown): Record<string, unknown>[] | null {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    return null
  }
  const out: Record<string, unknown>[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      return null
    }
    out.push(item)
  }
  return out
}

export function parseSafetyConfirmedEntry(
  value: unknown
): DailyLearningSafetyConfirmedEntry | null {
  if (!isRecord(value)) {
    return null
  }
  const proposal_id = asUuid(value.proposal_id)
  const confirmed_at = asString(value.confirmed_at)
  const role = typeof value.role === 'string'
    && OPERATOR_ROLES.has(value.role as DailyLearningOperatorRole)
    ? (value.role as DailyLearningOperatorRole)
    : null
  if (!proposal_id || !confirmed_at || !role) {
    return null
  }
  // confirmed_by is required uuid in schema but never shown — require presence only
  if (asUuid(value.confirmed_by) === null) {
    return null
  }
  return {
    proposal_id,
    role,
    confirmed_at
  }
}

function parseSafetyConfirmedList(value: unknown): DailyLearningSafetyConfirmedEntry[] | null {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    return null
  }
  const out: DailyLearningSafetyConfirmedEntry[] = []
  for (const item of value) {
    const parsed = parseSafetyConfirmedEntry(item)
    if (!parsed) {
      return null
    }
    out.push(parsed)
  }
  return out
}

/** AdminWeightSetDailyLearning (#76) — top-level detail.daily_learning only. */
export function parseAdminWeightSetDailyLearning(
  data: unknown
): AdminWeightSetDailyLearning | null {
  if (!isRecord(data)) {
    return null
  }
  if (!Array.isArray(data.proposals)
    || !Array.isArray(data.general_proposals)
    || !Array.isArray(data.safety_proposals)) {
    return null
  }

  const dateRaw = asNullableString(data.date)
  if (dateRaw === undefined && 'date' in data) {
    return null
  }
  const sourceRaw = asNullableString(data.source_published_version)
  if (sourceRaw === undefined && 'source_published_version' in data) {
    return null
  }
  const confirmedAtRaw = asNullableString(data.confirmed_at)
  if (confirmedAtRaw === undefined && 'confirmed_at' in data) {
    return null
  }
  const confirmedByRaw = asNullableString(data.confirmed_by)
  if (confirmedByRaw === undefined && 'confirmed_by' in data) {
    return null
  }
  if (confirmedByRaw != null && asUuid(confirmedByRaw) === null) {
    return null
  }
  const date = dateRaw === undefined ? null : dateRaw
  const source_published_version = sourceRaw === undefined ? null : sourceRaw
  const confirmed_at = confirmedAtRaw === undefined ? null : confirmedAtRaw
  const confirmed_by = confirmedByRaw === undefined ? null : confirmedByRaw

  const proposals: DailyLearningRowProposal[] = []
  for (const row of data.proposals) {
    const parsed = parseRowProposal(row)
    if (!parsed) {
      return null
    }
    proposals.push(parsed)
  }

  const general_proposals: DailyLearningGeneralProposal[] = []
  for (const item of data.general_proposals) {
    const parsed = parseGeneralProposal(item)
    if (!parsed) {
      return null
    }
    general_proposals.push(parsed)
  }

  const safety_proposals: DailyLearningSafetyProposal[] = []
  for (const item of data.safety_proposals) {
    const parsed = parseSafetyProposal(item)
    if (!parsed) {
      return null
    }
    safety_proposals.push(parsed)
  }

  const confirmed = parseObjectRecordArray(data.confirmed)
  const applied_general = parseObjectRecordArray(data.applied_general)
  const safety_confirmed = parseSafetyConfirmedList(data.safety_confirmed)
  if (!confirmed || !applied_general || !safety_confirmed) {
    return null
  }

  return {
    date,
    source_published_version,
    confirmed_at,
    confirmed_by,
    proposals,
    general_proposals,
    safety_proposals,
    confirmed,
    applied_general,
    safety_confirmed
  }
}

function toDraftResult(
  weight_set: DailyLearningWeightSetSummary,
  learning: AdminWeightSetDailyLearning
): DailyLearningDraftResult {
  return {
    weight_set,
    date: learning.date,
    source_published_version: learning.source_published_version,
    confirmed_at: learning.confirmed_at,
    confirmed_by: learning.confirmed_by,
    proposals: learning.proposals,
    general_proposals: learning.general_proposals,
    safety_proposals: learning.safety_proposals,
    confirmed: learning.confirmed,
    applied_general: learning.applied_general,
    safety_confirmed: learning.safety_confirmed
  }
}

/**
 * Parse generate／confirm response data.
 * `auto_published` may appear and is always false — ignored (not in page model).
 */
export function parseDailyLearningDraft(data: unknown): DailyLearningDraftResult | null {
  if (!isRecord(data)) {
    return null
  }
  const weight_set = parseWeightSetSummary(data.weight_set)
  if (!weight_set) {
    return null
  }
  const learning = parseAdminWeightSetDailyLearning(data)
  if (!learning) {
    return null
  }
  return toDraftResult(weight_set, learning)
}

/** List row with `daily_learning_pending === true` (#76). */
export function parsePendingDailyLearningListItem(
  value: unknown
): DailyLearningPendingListItem | null {
  const summary = parseWeightSetSummary(value)
  if (!summary || !summary.daily_learning_pending) {
    return null
  }
  return {
    ...summary,
    daily_learning_pending: true
  }
}

export function filterPendingDailyLearningDrafts(
  items: unknown[]
): DailyLearningPendingListItem[] {
  const out: DailyLearningPendingListItem[] = []
  for (const item of items) {
    const parsed = parsePendingDailyLearningListItem(item)
    if (parsed) {
      out.push(parsed)
    }
  }
  return out
}

/**
 * List refresh has its own error channel. Success → empty string so a later
 * successful draft load is never stuck under a stale list failure banner.
 */
export function listRefreshErrorMessage(
  failed: boolean,
  apiMessage: string,
  fallback: string
): string {
  if (!failed) {
    return ''
  }
  const trimmed = apiMessage.trim()
  return trimmed || fallback
}

/**
 * Build draft view from GET /weight-sets/{id}:
 * top-level `daily_learning` only (never config.daily_learning).
 */
export function parseDailyLearningFromWeightSetDetail(
  data: unknown
): DailyLearningDraftResult | null {
  if (!isRecord(data)) {
    return null
  }
  const weight_set = parseWeightSetSummary(data)
  if (!weight_set || data.daily_learning == null) {
    return null
  }
  const learning = parseAdminWeightSetDailyLearning(data.daily_learning)
  if (!learning) {
    return null
  }
  return toDraftResult(weight_set, learning)
}

export function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

/** Direction for weight-like from→to (null from treated as increase／new). */
export function generalDirection(
  proposal: DailyLearningGeneralProposal
): 'up' | 'down' | 'new' {
  if (proposal.kind === 'add_edge') {
    return 'new'
  }
  if (proposal.to > proposal.from) {
    return 'up'
  }
  if (proposal.to < proposal.from) {
    return 'down'
  }
  return 'up'
}

/**
 * Technical details for experts: weight／enum numbers only.
 * Omit UUID fields until #75 ships display names (experts must not see UUIDs).
 */
export function generalTechnical(proposal: DailyLearningGeneralProposal): Record<string, unknown> {
  switch (proposal.kind) {
    case 'base_weight':
      return {
        kind: proposal.kind,
        op: proposal.op,
        from: proposal.from,
        to: proposal.to,
        from_base_weight: proposal.from_base_weight,
        to_base_weight: proposal.to_base_weight
      }
    case 'add_edge':
      return {
        kind: proposal.kind,
        op: proposal.op,
        from: proposal.from,
        to: proposal.to,
        from_base_weight: proposal.from_base_weight,
        to_base_weight: proposal.to_base_weight,
        direction: proposal.direction,
        evidence_level: proposal.evidence_level
      }
    case 'signal_domain_weight':
      return {
        kind: proposal.kind,
        op: proposal.op,
        from: proposal.from,
        to: proposal.to
      }
  }
}

export function safetyTechnical(proposal: DailyLearningSafetyProposal): Record<string, unknown> {
  switch (proposal.kind) {
    case 'contraindication_exclude_to_warn':
      return {
        kind: proposal.kind,
        condition_code: proposal.condition_code,
        from: proposal.from,
        to: proposal.to
      }
    case 'interaction_exclude_to_penalize':
      return {
        kind: proposal.kind,
        from: proposal.from,
        to: proposal.to
      }
    case 'ul_override':
      return {
        kind: proposal.kind,
        from: proposal.from,
        to: proposal.to,
        dose_used: proposal.dose_used
      }
  }
}

export function buildDailyLearningConfirmBody(input: {
  classifications: Array<{
    knowledge_id: string
    classification: DailyLearningProposedClassification
  }>
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
