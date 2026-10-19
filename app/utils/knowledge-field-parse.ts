import type { KnowledgeDatasetStatus, KnowledgeReviewStatus } from '~/types/knowledge'

const DATASET_STATUSES = new Set<KnowledgeDatasetStatus>(['pending_review', 'active', 'disabled'])
const REVIEW_STATUSES = new Set<KnowledgeReviewStatus>(['draft', 'pending', 'approved', 'rejected', 'retired'])

export function parseLooseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) {
      return true
    }
    if (value === 0) {
      return false
    }
  }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase()
    if (text === 'true' || text === '1' || text === 'yes') {
      return true
    }
    if (text === 'false' || text === '0' || text === 'no') {
      return false
    }
  }
  return null
}

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

export function parseAllowThirdParty(row: Record<string, unknown>): boolean | null {
  const direct = parseLooseBoolean(row.allow_third_party)
  if (direct !== null) {
    return direct
  }
  return parseLooseBoolean(row.allow_third_party_sharing)
    ?? parseLooseBoolean(row.allows_third_party)
}
