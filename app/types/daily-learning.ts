/**
 * Strict types for candor-core #75 proposals + #76 weight-set daily_learning embed
 * (head 79ed13b). Discriminated unions by `kind`. Display names required keys, nullable.
 */

export type DailyLearningAdjustmentType = 'swap' | 'add' | 'remove' | 'dose_change'

export type DailyLearningProposedClassification
  = 'reusable'
    | 'personal_risk'
    | 'pending'

export type DailyLearningClassificationSource
  = 'llm'
    | 'fallback'
    | 'deterministic_gate'

export type DailyLearningPlainLanguageSource = 'ai' | 'template'

/** Required key; null when lookup misses (never show UUID). */
export type DailyLearningDisplayName = string | null

export type DailyLearningDecision = 'approve' | 'reject' | 'adjust'

export type DailyLearningOperatorRole = 'expert' | 'ops' | 'admin'

export type DailyLearningContextHit = {
  knowledge_id: string
  reason: string
  similarity: number
}

export type DailyLearningGeneralProposalBaseWeight = {
  id: string
  kind: 'base_weight'
  op: 'bump'
  domain_id: string
  ingredient_id: string
  domain_name: DailyLearningDisplayName
  ingredient_name: DailyLearningDisplayName
  from: number
  to: number
  from_base_weight: number
  to_base_weight: number
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: true
  plain_language: string
  plain_language_source: DailyLearningPlainLanguageSource
}

export type DailyLearningGeneralProposalAddEdge = {
  id: string
  kind: 'add_edge'
  op: 'add_edge'
  domain_id: string
  ingredient_id: string
  domain_name: DailyLearningDisplayName
  ingredient_name: DailyLearningDisplayName
  from: number | null
  to: number
  from_base_weight: number | null
  to_base_weight: number
  direction: 'deficit'
  evidence_level: 'C'
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: true
  plain_language: string
  plain_language_source: DailyLearningPlainLanguageSource
}

export type DailyLearningGeneralProposalSignalDomainWeight = {
  id: string
  kind: 'signal_domain_weight'
  op: 'bump_signal'
  biomarker_id: string
  domain_id: string
  biomarker_name: DailyLearningDisplayName
  domain_name: DailyLearningDisplayName
  from: number
  to: number
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: true
  plain_language: string
  plain_language_source: DailyLearningPlainLanguageSource
}

export type DailyLearningGeneralProposal
  = DailyLearningGeneralProposalBaseWeight
    | DailyLearningGeneralProposalAddEdge
    | DailyLearningGeneralProposalSignalDomainWeight

export type DailyLearningSafetyProposalContraindication = {
  id: string
  kind: 'contraindication_exclude_to_warn'
  contraindication_id: string
  ingredient_id: string
  condition_code: string
  ingredient_name: DailyLearningDisplayName
  condition_name: DailyLearningDisplayName
  from: 'exclude'
  to: 'warn'
  from_severity: 'exclude'
  to_severity: 'warn'
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: false
  high_risk: true
  plain_language: string
  plain_language_source: DailyLearningPlainLanguageSource
}

export type DailyLearningSafetyProposalInteraction = {
  id: string
  kind: 'interaction_exclude_to_penalize'
  interaction_id: string
  ingredient_a_id: string
  ingredient_b_id: string
  ingredient_a_name: DailyLearningDisplayName
  ingredient_b_name: DailyLearningDisplayName
  from: { effect: 'exclude', penalty: number | null }
  to: { effect: 'penalize', penalty: number }
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: false
  high_risk: true
  plain_language: string
  plain_language_source: DailyLearningPlainLanguageSource
}

export type DailyLearningSafetyProposalUlOverride = {
  id: string
  kind: 'ul_override'
  ingredient_id: string
  ingredient_name: DailyLearningDisplayName
  from: number | null
  to: number
  dose_used: number
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: false
  high_risk: true
  plain_language: string
  plain_language_source: DailyLearningPlainLanguageSource
}

export type DailyLearningSafetyProposal
  = DailyLearningSafetyProposalContraindication
    | DailyLearningSafetyProposalInteraction
    | DailyLearningSafetyProposalUlOverride

export type DailyLearningRowProposal = {
  knowledge_id: string
  expert_case_review_id: string
  decision: DailyLearningDecision
  adjustment_type: DailyLearningAdjustmentType | null
  proposed_classification: DailyLearningProposedClassification
  classification_rationale: string
  classification_source: DailyLearningClassificationSource
  needs_human: boolean
  context_hits: DailyLearningContextHit[]
  general_proposals: DailyLearningGeneralProposal[]
  safety_proposals: DailyLearningSafetyProposal[]
  weight_changes: Array<
    DailyLearningGeneralProposalBaseWeight | DailyLearningGeneralProposalAddEdge
  >
  contraindication_changes: DailyLearningSafetyProposalContraindication[]
}

/** AdminWeightSetSummary / detail common fields (#76). */
export type DailyLearningWeightSetSummary = {
  id: string
  version: string
  status: string
  label: string | null
  published_at: string | null
  last_dry_run_passed: boolean | null
  created_at: string | null
  is_daily_learning_draft: boolean
  daily_learning_pending: boolean
}

/** List candidates: `daily_learning_pending === true`. */
export type DailyLearningPendingListItem = DailyLearningWeightSetSummary & {
  daily_learning_pending: true
}

/** safety_confirmed[] item — never display confirmed_by UUID. */
export type DailyLearningSafetyConfirmedEntry = {
  proposal_id: string
  role: DailyLearningOperatorRole
  confirmed_at: string
}

/**
 * AdminWeightSetDailyLearning (#76) — no auto_published.
 * Embed on GET /weight-sets/{id} as top-level `daily_learning` (nullable).
 */
export type AdminWeightSetDailyLearning = {
  date: string | null
  source_published_version: string | null
  confirmed_at: string | null
  /** UUID — do not show in UI. */
  confirmed_by: string | null
  proposals: DailyLearningRowProposal[]
  general_proposals: DailyLearningGeneralProposal[]
  safety_proposals: DailyLearningSafetyProposal[]
  confirmed: Record<string, unknown>[]
  applied_general: Record<string, unknown>[]
  safety_confirmed: DailyLearningSafetyConfirmedEntry[]
}

/** Unified page model from generate response or detail.daily_learning. */
export type DailyLearningDraftResult = {
  weight_set: DailyLearningWeightSetSummary
  date: string | null
  source_published_version: string | null
  confirmed_at: string | null
  confirmed_by: string | null
  proposals: DailyLearningRowProposal[]
  general_proposals: DailyLearningGeneralProposal[]
  safety_proposals: DailyLearningSafetyProposal[]
  confirmed: Record<string, unknown>[]
  applied_general: Record<string, unknown>[]
  safety_confirmed: DailyLearningSafetyConfirmedEntry[]
}

export type DailyLearningStep
  = 'idle'
    | 'drafted'
    | 'general_confirmed'
    | 'dry_run_done'
    | 'published'
