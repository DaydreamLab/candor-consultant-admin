/**
 * Strict types for candor-core #75 (head 141c24b) daily-learning schemas.
 * Discriminated unions by `kind`. Display names are required keys, nullable values.
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

export type DailyLearningWeightSetSummary = {
  id: string
  version: string
  status: string
  label: string | null
  last_dry_run_passed: boolean | null
}

/**
 * Provisional list row (H-core schema pending).
 * List marker: `daily_learning_pending: true` on draft weight sets that still need confirm.
 */
export type DailyLearningPendingListItem = DailyLearningWeightSetSummary & {
  daily_learning_pending: true
}

export type DailyLearningDraftResult = {
  weight_set: DailyLearningWeightSetSummary
  date: string
  proposals: DailyLearningRowProposal[]
  general_proposals: DailyLearningGeneralProposal[]
  safety_proposals: DailyLearningSafetyProposal[]
  auto_published: false
}

/**
 * Provisional detail embed (H-core schema pending).
 * `GET /weight-sets/{id}.daily_learning` — same proposal payload as draft, without weight_set.
 */
export type DailyLearningDetailPayload = {
  date: string
  proposals: DailyLearningRowProposal[]
  general_proposals: DailyLearningGeneralProposal[]
  safety_proposals: DailyLearningSafetyProposal[]
  auto_published: false
}

export type DailyLearningStep
  = 'idle'
    | 'drafted'
    | 'general_confirmed'
    | 'dry_run_done'
    | 'published'
