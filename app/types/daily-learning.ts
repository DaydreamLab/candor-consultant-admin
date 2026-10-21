/**
 * Strict types for candor-core #75 (head 681d6eb) daily-learning schemas.
 * Discriminated unions by `kind`. Do not add fallback / alternate field keys here.
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
  from: number
  to: number
  from_base_weight: number
  to_base_weight: number
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: true
}

export type DailyLearningGeneralProposalAddEdge = {
  id: string
  kind: 'add_edge'
  op: 'add_edge'
  domain_id: string
  ingredient_id: string
  from: number | null
  to: number
  from_base_weight: number | null
  to_base_weight: number
  direction: 'deficit'
  evidence_level: 'C'
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: true
}

export type DailyLearningGeneralProposalSignalDomainWeight = {
  id: string
  kind: 'signal_domain_weight'
  op: 'bump_signal'
  biomarker_id: string
  domain_id: string
  from: number
  to: number
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: true
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
  from: 'exclude'
  to: 'warn'
  from_severity: 'exclude'
  to_severity: 'warn'
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: false
  high_risk: true
}

export type DailyLearningSafetyInteractionEndpoint = {
  effect: 'exclude' | 'penalize'
  penalty: number | null
}

export type DailyLearningSafetyProposalInteraction = {
  id: string
  kind: 'interaction_exclude_to_penalize'
  interaction_id: string
  ingredient_a_id: string
  ingredient_b_id: string
  from: { effect: 'exclude', penalty: number | null }
  to: { effect: 'penalize', penalty: number }
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: false
  high_risk: true
}

export type DailyLearningSafetyProposalUlOverride = {
  id: string
  kind: 'ul_override'
  ingredient_id: string
  from: number | null
  to: number
  dose_used: number
  knowledge_id: string
  adjustment_type: DailyLearningAdjustmentType
  default_agree: false
  high_risk: true
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

export type DailyLearningDraftResult = {
  weight_set: DailyLearningWeightSetSummary
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
