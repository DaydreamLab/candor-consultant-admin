import type { KnowledgeDataset, KnowledgeGapReason } from '~/types/knowledge'

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
  if (optionalString(hit.dataset_id)) {
    flat.dataset_id = hit.dataset_id
  }
  if (dataset) {
    flat.dataset_code = flat.dataset_code ?? dataset.code
    flat.dataset_name = flat.dataset_name ?? dataset.name
    flat.dataset_id = flat.dataset_id ?? dataset.id
    flat.dataset = dataset
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

export type KnowledgeDatasetLookup = {
  byId: Map<string, Pick<KnowledgeDataset, 'name' | 'code'>>
}

export function buildKnowledgeDatasetLookup(datasets: KnowledgeDataset[]): KnowledgeDatasetLookup {
  const byId = new Map<string, Pick<KnowledgeDataset, 'name' | 'code'>>()
  for (const row of datasets) {
    byId.set(row.id, { name: row.name, code: row.code })
  }
  return { byId }
}

function formatDatasetNameAndCode(name: string | null, code: string | null): string | null {
  if (name && code && name !== code) {
    return `${name} (${code})`
  }
  return name ?? code
}

export function readRetrievalHitDatasetId(hit: Record<string, unknown>): string | null {
  const direct = optionalString(hit.dataset_id)
  if (direct) {
    return direct
  }
  const dataset = isRecord(hit.dataset) ? hit.dataset : null
  if (dataset) {
    return optionalString(dataset.id)
  }
  return null
}

export function retrievalHitDatasetLabel(
  hit: Record<string, unknown>,
  lookup?: KnowledgeDatasetLookup
): string | null {
  const name = optionalString(hit.dataset_name)
  const code = optionalString(hit.dataset_code)
  const fromFlat = formatDatasetNameAndCode(name, code)
  if (fromFlat) {
    return fromFlat
  }
  const dataset = isRecord(hit.dataset) ? hit.dataset : null
  if (dataset) {
    const nested = formatDatasetNameAndCode(
      optionalString(dataset.name),
      optionalString(dataset.code)
    )
    if (nested) {
      return nested
    }
  }
  const datasetId = readRetrievalHitDatasetId(hit)
  if (datasetId && lookup) {
    const row = lookup.byId.get(datasetId)
    if (row) {
      return formatDatasetNameAndCode(
        optionalString(row.name),
        optionalString(row.code)
      )
    }
  }
  return null
}

/** 卡片上永遠顯示資料集欄時使用；無識別時為 em dash。 */
export function retrievalHitDatasetDisplay(
  hit: Record<string, unknown>,
  lookup?: KnowledgeDatasetLookup
): string {
  return retrievalHitDatasetLabel(hit, lookup) ?? '—'
}

/**
 * Nutrients covered by hits for the preview panel.
 * Prefer API `represented_nutrients`; when absent but hits exist, fall back to `detected_nutrients`
 * (single-nutrient queries often omit represented_nutrients).
 */
export function representedNutrientsForPreview(
  queryInfo: Record<string, unknown> | null | undefined,
  hitCount: number
): unknown[] {
  if (hitCount <= 0 || !queryInfo) {
    return []
  }
  const represented = queryInfo.represented_nutrients
  if (Array.isArray(represented) && represented.length) {
    return represented
  }
  const detected = queryInfo.detected_nutrients
  if (Array.isArray(detected) && detected.length) {
    return detected
  }
  return []
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
  reasonLabel: (reason: KnowledgeGapReason) => string,
  formatNutrientKey?: (key: string) => string
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
      .map((item) => {
        if (typeof item !== 'string') {
          return ''
        }
        const trimmed = item.trim()
        if (!trimmed) {
          return ''
        }
        return formatNutrientKey ? formatNutrientKey(trimmed) : trimmed
      })
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
