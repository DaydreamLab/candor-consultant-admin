import type { KnowledgeGapReason } from '~/types/knowledge'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const GAP_REASONS = new Set<KnowledgeGapReason>([
  'no_matching_hits',
  'insufficient_multi_nutrient_hits',
  'partial_multi_nutrient_hits'
])

export function parseKnowledgeGapPayload(data: Record<string, unknown>): Record<string, unknown> | null {
  const candidates = [
    data.knowledge_gap,
    data.knowledgeGap,
    data.gap,
    data.retrieval_gap
  ]
  for (const item of candidates) {
    if (isRecord(item)) {
      return item
    }
  }
  const reason = data.gap_reason ?? data.knowledge_gap_reason
  if (typeof reason === 'string' && GAP_REASONS.has(reason as KnowledgeGapReason)) {
    return { reason }
  }
  return null
}

export function parseRetrievalHits(data: Record<string, unknown>): Record<string, unknown>[] {
  const lists = [data.hits, data.results, data.matches, data.chunks]
  for (const list of lists) {
    if (Array.isArray(list)) {
      return list.filter(isRecord).map(normalizeRetrievalHit)
    }
  }
  return []
}

/** 扁平化常見的 { chunk, score, dataset } 巢狀結構。 */
export function normalizeRetrievalHit(hit: Record<string, unknown>): Record<string, unknown> {
  const chunk = isRecord(hit.chunk) ? hit.chunk : null
  const dataset = isRecord(hit.dataset) ? hit.dataset : null
  const flat: Record<string, unknown> = { ...hit }
  if (chunk) {
    Object.assign(flat, chunk)
    flat.chunk_id = flat.chunk_id ?? chunk.id
  }
  if (dataset) {
    flat.dataset_code = flat.dataset_code ?? dataset.code
    flat.dataset_name = flat.dataset_name ?? dataset.name
    flat.dataset_id = flat.dataset_id ?? dataset.id
  }
  flat.score = hit.score ?? hit.relevance_score ?? hit.similarity ?? hit.rank_score
    ?? chunk?.score ?? chunk?.relevance_score
  flat.text_preview = flat.text_preview ?? flat.text ?? flat.content
  return flat
}
