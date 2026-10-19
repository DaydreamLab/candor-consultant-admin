import type { KnowledgeDatasetStatus, KnowledgeReviewStatus } from '~/types/knowledge'

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

export function allowThirdPartyBadgeColor(value: boolean | null | undefined): 'success' | 'neutral' | 'warning' {
  if (value === true) {
    return 'success'
  }
  if (value === false) {
    return 'neutral'
  }
  return 'warning'
}
