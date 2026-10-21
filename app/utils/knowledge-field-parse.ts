import type { KnowledgeDatasetStatus, KnowledgeReviewStatus } from '~/types/knowledge'

const DATASET_STATUSES = new Set<KnowledgeDatasetStatus>(['pending_review', 'active', 'disabled'])
const REVIEW_STATUSES = new Set<KnowledgeReviewStatus>(['draft', 'pending', 'approved', 'rejected', 'retired'])

export function parseKnowledgeDatasetStatus(row: Record<string, unknown>): KnowledgeDatasetStatus | '' {
  const candidates = [row.status, row.dataset_status, row.lifecycle_status]
  for (const value of candidates) {
    if (typeof value === 'string' && DATASET_STATUSES.has(value as KnowledgeDatasetStatus)) {
      return value as KnowledgeDatasetStatus
    }
  }
  return ''
}

export function parseKnowledgeReviewStatus(row: Record<string, unknown>): KnowledgeReviewStatus | '' {
  const candidates = [row.review_status, row.reviewStatus, row.status]
  for (const value of candidates) {
    if (typeof value === 'string' && REVIEW_STATUSES.has(value as KnowledgeReviewStatus)) {
      return value as KnowledgeReviewStatus
    }
  }
  return ''
}

export function resolveKnowledgeGroupKey(row: Record<string, unknown>): string | null {
  const fromKey = typeof row.group_key === 'string' ? row.group_key.trim() : ''
  if (fromKey) {
    return fromKey
  }
  const fromGroup = typeof row.group === 'string' ? row.group.trim() : ''
  return fromGroup || null
}
