import type { KnowledgeGapReason } from '~/types/knowledge'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const GAP_REASONS = new Set<KnowledgeGapReason>([
  'no_matching_hits',
  'insufficient_multi_nutrient_hits',
  'partial_multi_nutrient_hits'
])

function queryInfoOf(data: Record<string, unknown>): Record<string, unknown> | null {
  if (isRecord(data.query_info)) {
    return data.query_info
  }
  if (isRecord(data.queryInfo)) {
    return data.queryInfo
  }
  return null
}

export function parseKnowledgeGapPayload(data: Record<string, unknown>): Record<string, unknown> | null {
  const queryInfo = queryInfoOf(data)
  const candidates = [
    queryInfo?.knowledge_gap,
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
  const reason = queryInfo?.gap_reason
    ?? data.gap_reason
    ?? data.knowledge_gap_reason
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

function readScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}

function optionalString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return null
}

/** 扁平化常見的 { chunk, score, dataset } 與真實 API 的 document／scores 結構。 */
export function normalizeRetrievalHit(hit: Record<string, unknown>): Record<string, unknown> {
  const chunk = isRecord(hit.chunk) ? hit.chunk : null
  const dataset = isRecord(hit.dataset) ? hit.dataset : null
  const document = isRecord(hit.document) ? hit.document : null
  const scores = isRecord(hit.scores) ? hit.scores : null
  const flat: Record<string, unknown> = { ...hit }
  if (chunk) {
    Object.assign(flat, chunk)
    flat.chunk_id = flat.chunk_id ?? chunk.id
  }
  if (optionalString(hit.dataset_code)) {
    flat.dataset_code = hit.dataset_code
  }
  if (optionalString(hit.dataset_name)) {
    flat.dataset_name = hit.dataset_name
  }
  if (dataset) {
    flat.dataset_code = flat.dataset_code ?? dataset.code
    flat.dataset_name = flat.dataset_name ?? dataset.name
    flat.dataset_id = flat.dataset_id ?? dataset.id
  }
  if (document) {
    flat.document_title = flat.document_title ?? document.title
    flat.document_source_name = document.source_name ?? document.title
    flat.source_url = flat.source_url ?? document.source_url
    flat.license = flat.license ?? document.license
    flat.document_id = flat.document_id ?? document.id
  }
  if (scores) {
    flat.score_rrf = scores.rrf
    flat.score_vector = scores.vector
    flat.score_keyword = scores.keyword
    flat.tagged_supplement = scores.tagged_supplement
    flat.reference_tagged_rescue = scores.reference_tagged_rescue
  }
  flat.score = hit.score ?? hit.relevance_score ?? hit.similarity ?? hit.rank_score
    ?? readScore(scores?.vector) ?? readScore(scores?.rrf) ?? readScore(scores?.keyword)
    ?? chunk?.score ?? chunk?.relevance_score
  flat.text_preview = flat.text_preview ?? flat.text ?? flat.content
  return flat
}

export type RetrievalHitScoreLine = {
  key: 'rrf' | 'vector' | 'keyword'
  labelKey: string
  value: string | null
  missingLabelKey?: string | null
}

export type KnowledgeGapDetailRow = {
  labelKey: string
  value: string
}

export function retrievalHitIsRescue(hit: Record<string, unknown>): boolean {
  if (readScore(hit.score_vector) != null) {
    return false
  }
  return readScore(hit.tagged_supplement) != null || readScore(hit.reference_tagged_rescue) != null
}

export function retrievalHitScoreLines(hit: Record<string, unknown>): RetrievalHitScoreLine[] {
  const rescue = retrievalHitIsRescue(hit)
  const lines: RetrievalHitScoreLine[] = [
    {
      key: 'rrf',
      labelKey: 'knowledge.retrievalPreview.scores.rrf',
      value: rescue && readScore(hit.score_rrf) === 0 ? null : formatScore(hit.score_rrf)
    },
    {
      key: 'vector',
      labelKey: 'knowledge.retrievalPreview.scores.vector',
      value: formatScore(hit.score_vector),
      missingLabelKey: rescue ? 'knowledge.retrievalPreview.rescueBadge' : retrievalHitSupplementLabelKey(hit)
    },
    {
      key: 'keyword',
      labelKey: 'knowledge.retrievalPreview.scores.keyword',
      value: formatScore(hit.score_keyword)
    }
  ]
  return lines.filter((line) => {
    if (line.value) {
      return true
    }
    return Boolean(line.missingLabelKey)
  })
}

export function retrievalHitSupplementLabelKey(hit: Record<string, unknown>): string | null {
  if (readScore(hit.reference_tagged_rescue) != null && readScore(hit.score_vector) == null) {
    return 'knowledge.retrievalPreview.scores.referenceRescue'
  }
  if (readScore(hit.tagged_supplement) != null && readScore(hit.score_vector) == null) {
    return 'knowledge.retrievalPreview.scores.taggedSupplement'
  }
  return null
}

export function retrievalHitDatasetLabel(hit: Record<string, unknown>): string | null {
  const name = optionalString(hit.dataset_name)
  const code = optionalString(hit.dataset_code)
  if (name && code && name !== code) {
    return `${name} (${code})`
  }
  if (name) {
    return name
  }
  if (code) {
    return code
  }
  const dataset = isRecord(hit.dataset) ? hit.dataset : null
  if (dataset) {
    const nestedName = optionalString(dataset.name)
    const nestedCode = optionalString(dataset.code)
    if (nestedName && nestedCode) {
      return `${nestedName} (${nestedCode})`
    }
    return nestedName ?? nestedCode
  }
  return null
}

export function retrievalHitSourceLabel(hit: Record<string, unknown>): string | null {
  const title = optionalString(hit.document_title)
  if (title) {
    return title
  }
  return optionalString(hit.document_source_name)
}

export function knowledgeGapDetailRows(
  gap: Record<string, unknown>,
  reasonLabel: (reason: KnowledgeGapReason) => string
): KnowledgeGapDetailRow[] {
  const rows: KnowledgeGapDetailRow[] = []
  const reason = gap.reason
  if (typeof reason === 'string' && GAP_REASONS.has(reason as KnowledgeGapReason)) {
    rows.push({
      labelKey: 'knowledge.retrievalPreview.gapFields.reason',
      value: reasonLabel(reason as KnowledgeGapReason)
    })
  }
  if (typeof gap.message === 'string' && gap.message.trim()) {
    rows.push({
      labelKey: 'knowledge.retrievalPreview.gapFields.message',
      value: gap.message.trim()
    })
  }
  const keys = gap.nutrient_keys ?? gap.nutrientKeys
  if (Array.isArray(keys) && keys.length) {
    const text = keys
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join('、')
    if (text) {
      rows.push({
        labelKey: 'knowledge.retrievalPreview.gapFields.nutrientKeys',
        value: text
      })
    }
  }
  return rows
}

function formatScore(value: unknown): string | null {
  const n = readScore(value)
  if (n == null) {
    return null
  }
  if (n === 0) {
    return null
  }
  return n.toFixed(4)
}
