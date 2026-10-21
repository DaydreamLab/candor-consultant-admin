import type { KnowledgeChunkListQuery, KnowledgeReviewStatus } from '~/types/knowledge'

export const KNOWLEDGE_CHUNK_FILTER_ANY = 'all'

/** Build GET /knowledge/chunks query; status is sent to the API (not client-only). */
export function buildKnowledgeChunkListQuery(options: {
  group?: string | null
  filterStatus: string
}): KnowledgeChunkListQuery {
  const query: KnowledgeChunkListQuery = {}
  const group = options.group?.trim()
  if (group) {
    query.group = group
  }
  if (options.filterStatus && options.filterStatus !== KNOWLEDGE_CHUNK_FILTER_ANY) {
    query.status = options.filterStatus as KnowledgeReviewStatus
  }
  return query
}
