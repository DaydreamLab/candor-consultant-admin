import type {
  KnowledgeDatasetStatus,
  KnowledgeDefaultReviewMode,
  KnowledgeReviewStatus
} from '~/types/knowledge'

export function datasetStatusBadgeColor(status: KnowledgeDatasetStatus | ''): 'success' | 'warning' | 'neutral' {
  if (status === 'active') {
    return 'success'
  }
  if (status === 'pending_review') {
    return 'warning'
  }
  return 'neutral'
}

export function defaultReviewModeBadgeColor(
  mode: KnowledgeDefaultReviewMode | string | null | undefined
): 'success' | 'neutral' {
  return mode === 'auto_approve' ? 'success' : 'neutral'
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
