import type { KnowledgeDatasetStatus, KnowledgeReviewStatus } from '~/types/knowledge'

export type AllowThirdPartyBadgeColor = 'success' | 'neutral' | 'error'

export type AllowThirdPartyLabelKey = 'yes' | 'no' | 'unset'

export function datasetStatusBadgeColor(status: KnowledgeDatasetStatus | ''): 'success' | 'warning' | 'neutral' {
  if (status === 'active') {
    return 'success'
  }
  if (status === 'pending_review') {
    return 'warning'
  }
  return 'neutral'
}

export function reviewStatusBadgeColor(status: KnowledgeReviewStatus | ''): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'approved') {
    return 'success'
  }
  if (status === 'pending') {
    return 'warning'
  }
  if (status === 'rejected') {
    return 'error'
  }
  return 'neutral'
}

/**
 * ADR 0027: `true` = allow, `false` = forbid, `null`/`undefined` = no
 * third-party restriction (treat as allowed). Badge styles stay distinct.
 */
export function allowThirdPartyBadgeColor(value: boolean | null | undefined): AllowThirdPartyBadgeColor {
  if (value === true) {
    return 'success'
  }
  if (value === false) {
    return 'error'
  }
  return 'neutral'
}

/** i18n key segment under `knowledge.datasets.allowThirdParty.*`. */
export function allowThirdPartyLabelKey(value: boolean | null | undefined): AllowThirdPartyLabelKey {
  if (value === true) {
    return 'yes'
  }
  if (value === false) {
    return 'no'
  }
  return 'unset'
}
