import type { KnowledgeChunkListQuery, KnowledgeReviewStatus } from '~/types/knowledge'

export const KNOWLEDGE_CHUNK_FILTER_ANY = 'all'

/** Default page size for GET /knowledge/chunks (aligned with core default). */
export const KNOWLEDGE_CHUNK_PAGE_SIZE = 50

/** Default review-status filter for chunk review UIs. */
export const KNOWLEDGE_CHUNK_DEFAULT_STATUS = 'pending'

/** Build GET /knowledge/chunks query; status is sent to the API (not client-only). */
export function buildKnowledgeChunkListQuery(options: {
  group?: string | null
  filterStatus: string
  limit?: number
  offset?: number
  cursor?: string | null
}): KnowledgeChunkListQuery {
  const query: KnowledgeChunkListQuery = {}
  const group = options.group?.trim()
  if (group) {
    query.group = group
  }
  if (options.filterStatus && options.filterStatus !== KNOWLEDGE_CHUNK_FILTER_ANY) {
    query.status = options.filterStatus as KnowledgeReviewStatus
  }
  if (typeof options.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0) {
    query.limit = options.limit
  }
  if (typeof options.offset === 'number' && Number.isFinite(options.offset) && options.offset >= 0) {
    query.offset = options.offset
  }
  const cursor = options.cursor?.trim()
  if (cursor) {
    query.cursor = cursor
  }
  return query
}

/** Infer whether another page exists when core returns a bare array (no page meta). */
export function knowledgeChunkListHasMore(batchLength: number, limit: number = KNOWLEDGE_CHUNK_PAGE_SIZE) {
  return batchLength >= limit
}
