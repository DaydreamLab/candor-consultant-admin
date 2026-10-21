/**
 * Provisional field-key map for daily-learning draft proposals (ADR 0028).
 *
 * candor-core #75 OpenAPI still uses additionalProperties:true for
 * proposals / general_proposals / safety_proposals. When #75 lands a real
 * schema, replace THIS FILE only (and tighten types in daily-learning.ts);
 * do not scatter alternate keys across the page.
 */

/** Keys tried in order for a human-readable classification rationale. */
export const CLASSIFICATION_RATIONALE_KEYS = [
  'rationale',
  'plain_language',
  'plain_rationale',
  'ai_rationale',
  'reason',
  'summary'
] as const

/** Keys tried for general-proposal plain language (no weight numbers). */
export const GENERAL_PLAIN_LANGUAGE_KEYS = [
  'plain_language',
  'summary',
  'description',
  'rationale',
  'explanation'
] as const

/** Keys tried for safety-proposal risk copy. */
export const SAFETY_RISK_TEXT_KEYS = [
  'risk_text',
  'plain_language',
  'risk_summary',
  'summary',
  'description',
  'rationale'
] as const

/** Identity / linkage keys (not shown as “technical details”). */
export const PROPOSAL_IDENTITY_KEYS = [
  'id',
  'proposal_id',
  'knowledge_id'
] as const

/** Classification row display keys excluded from technical dump. */
export const CLASSIFICATION_DISPLAY_KEYS = [
  ...PROPOSAL_IDENTITY_KEYS,
  'proposed_classification',
  'classification',
  ...CLASSIFICATION_RATIONALE_KEYS,
  'decision',
  'package_plan_code'
] as const

/** General proposal display keys excluded from technical dump. */
export const GENERAL_DISPLAY_KEYS = [
  ...PROPOSAL_IDENTITY_KEYS,
  ...GENERAL_PLAIN_LANGUAGE_KEYS,
  'kind',
  'type',
  'parameter',
  'ingredient_label',
  'ingredient_name',
  'ingredient',
  'domain_label',
  'domain_name',
  'domain'
] as const

/** Safety proposal display keys excluded from technical dump. */
export const SAFETY_DISPLAY_KEYS = [
  ...PROPOSAL_IDENTITY_KEYS,
  ...SAFETY_RISK_TEXT_KEYS,
  'kind',
  'type',
  'parameter',
  'safety_kind',
  'from',
  'to',
  'from_effect',
  'to_effect',
  'from_label',
  'to_label'
] as const

export const CLASSIFICATION_VALUE_KEYS = [
  'proposed_classification',
  'classification'
] as const

export const GENERAL_KIND_KEYS = ['kind', 'type', 'parameter'] as const

export const SAFETY_KIND_KEYS = [
  'kind',
  'type',
  'parameter',
  'safety_kind'
] as const

export const INGREDIENT_LABEL_KEYS = [
  'ingredient_label',
  'ingredient_name',
  'ingredient'
] as const

export const DOMAIN_LABEL_KEYS = [
  'domain_label',
  'domain_name',
  'domain'
] as const

export const FROM_LABEL_KEYS = [
  'from_label',
  'from_effect',
  'from'
] as const

export const TO_LABEL_KEYS = [
  'to_label',
  'to_effect',
  'to'
] as const
