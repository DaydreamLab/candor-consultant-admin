function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

function pickFromRecord(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const n = readNumber(record[key])
    if (n !== null) {
      return n
    }
  }
  return null
}

export type KnowledgeOverviewTotals = {
  chunks: number | null
  documents: number | null
  datasetsActive: number | null
}

/**
 * Keys that may hold per-dataset rows on GET /knowledge/overview `data`.
 * Live beta historically returned totals only (no rows); core may add any of these.
 */
const DATASET_LIST_KEYS = [
  'datasets',
  'items',
  'rows',
  'dataset_rows',
  'dataset_summaries',
  'dataset_overview',
  'public_datasets',
  'knowledge_datasets',
  'by_dataset'
] as const

const NESTED_LIST_PARENT_KEYS = ['summary', 'totals', 'counts', 'overview'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function rowsFromArray(value: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(value) || !value.length) {
    return null
  }
  const rows = value.filter(row => row && typeof row === 'object' && !Array.isArray(row)) as Record<string, unknown>[]
  return rows.length ? rows : null
}

function rowsFromKnownKeys(data: Record<string, unknown>): Record<string, unknown>[] | null {
  for (const key of DATASET_LIST_KEYS) {
    const rows = rowsFromArray(data[key])
    if (rows) {
      return rows
    }
  }
  return null
}

/**
 * Normalize one overview dataset row for table display.
 * Accepts both flat dataset fields and lightly nested `{ dataset: {...}, counts: {...} }`.
 */
export function normalizeOverviewDatasetRow(row: Record<string, unknown>): Record<string, unknown> {
  const nested = isRecord(row.dataset) ? row.dataset : null
  const counts = isRecord(row.counts)
    ? row.counts
    : isRecord(row.stats)
      ? row.stats
      : null

  const code = row.code ?? nested?.code
  const name = row.name ?? nested?.name ?? row.source_name ?? nested?.source_name
  const status = row.status ?? row.dataset_status ?? nested?.status
  const id = row.id ?? row.dataset_id ?? nested?.id
  const attribution = row.attribution ?? nested?.attribution
  const license = row.license ?? nested?.license
  const sourceUrl = row.source_url ?? nested?.source_url
  const defaultReviewMode = row.default_review_mode ?? row.review_mode ?? nested?.default_review_mode
  const documentCount = row.document_count
    ?? row.documents
    ?? counts?.document_count
    ?? counts?.documents
  const chunkCount = row.chunk_count
    ?? row.chunks
    ?? counts?.chunk_count
    ?? counts?.chunks
  const chunksByReview = row.chunks_by_review_status
    ?? row.review_status_counts
    ?? counts?.chunks_by_review_status
    ?? nested?.chunks_by_review_status

  return {
    ...row,
    id,
    code,
    name,
    status,
    attribution,
    license,
    source_url: sourceUrl,
    default_review_mode: defaultReviewMode,
    document_count: documentCount,
    chunk_count: chunkCount,
    chunks_by_review_status: chunksByReview
  }
}

/** 從 overview `data` 取出資料集列（多鍵名／巢狀 fallback；無列時回傳 []）。 */
export function extractOverviewDatasetRows(data: unknown): Record<string, unknown>[] {
  const asArray = rowsFromArray(data)
  if (asArray) {
    return asArray.map(normalizeOverviewDatasetRow)
  }
  if (!isRecord(data)) {
    return []
  }

  const direct = rowsFromKnownKeys(data)
  if (direct) {
    return direct.map(normalizeOverviewDatasetRow)
  }

  for (const parentKey of NESTED_LIST_PARENT_KEYS) {
    const nested = data[parentKey]
    if (isRecord(nested)) {
      const fromNested = rowsFromKnownKeys(nested)
      if (fromNested) {
        return fromNested.map(normalizeOverviewDatasetRow)
      }
    }
  }

  return []
}

/** 從 overview `data` 寬物件推斷全庫計數（多鍵名 fallback）。 */
export function extractKnowledgeOverviewTotals(data: Record<string, unknown>): KnowledgeOverviewTotals {
  const totals = isRecord(data.totals) ? data.totals : null
  const summary = isRecord(data.summary) ? data.summary : null
  const counts = isRecord(data.counts) ? data.counts : null

  const chunks = pickFromRecord(data, ['chunks_total', 'total_chunks', 'chunk_count', 'chunks', 'total_chunk_count'])
    ?? (totals ? pickFromRecord(totals, ['chunks', 'chunks_total', 'total_chunks', 'chunk_count']) : null)
    ?? (summary ? pickFromRecord(summary, ['chunks', 'chunks_total', 'total_chunks']) : null)
    ?? (counts ? pickFromRecord(counts, ['chunks', 'chunk_count', 'chunks_total']) : null)

  const documents = pickFromRecord(data, ['documents_total', 'total_documents', 'document_count', 'documents', 'total_document_count'])
    ?? (totals ? pickFromRecord(totals, ['documents', 'documents_total', 'total_documents', 'document_count']) : null)
    ?? (summary ? pickFromRecord(summary, ['documents', 'documents_total', 'total_documents']) : null)
    ?? (counts ? pickFromRecord(counts, ['documents', 'document_count', 'documents_total']) : null)

  let datasetsActive = pickFromRecord(data, ['datasets_active', 'active_datasets', 'active_dataset_count'])
    ?? (totals ? pickFromRecord(totals, ['datasets_active', 'active', 'active_datasets']) : null)
    ?? (counts ? pickFromRecord(counts, ['active_datasets', 'datasets_active']) : null)

  const byStatus = data.datasets_by_status ?? data.dataset_status_counts ?? totals?.datasets_by_status
  if (datasetsActive === null && isRecord(byStatus)) {
    datasetsActive = readNumber(byStatus.active)
  }

  const rows = extractOverviewDatasetRows(data)
  if (datasetsActive === null && rows.length) {
    datasetsActive = rows.filter((row) => {
      const status = row.status ?? row.dataset_status
      return status === 'active'
    }).length
  }

  return { chunks, documents, datasetsActive }
}

export function overviewHasVisibleContent(data: Record<string, unknown> | null): boolean {
  if (!data) {
    return false
  }
  const totals = extractKnowledgeOverviewTotals(data)
  if (totals.chunks != null || totals.documents != null || totals.datasetsActive != null) {
    return true
  }
  return extractOverviewDatasetRows(data).length > 0
}

export function readConfigTopK(config: Record<string, unknown> | null): number | null {
  if (!config) {
    return null
  }
  const topLevel = pickFromRecord(config, ['top_k', 'retrieval_top_k', 'default_top_k', 'preview_top_k'])
  if (topLevel != null) {
    return topLevel
  }
  const search = isRecord(config.search) ? config.search : null
  if (search) {
    return pickFromRecord(search, ['default_top_k', 'top_k', 'retrieval_top_k'])
  }
  return null
}

/** Compact review-status counts for overview table cells. */
export function formatOverviewReviewCounts(value: unknown): string {
  if (!isRecord(value)) {
    return '—'
  }
  const keys = ['pending', 'approved', 'rejected', 'draft', 'retired'] as const
  const parts: string[] = []
  for (const key of keys) {
    const n = readNumber(value[key])
    if (n != null && n > 0) {
      parts.push(`${key}:${n}`)
    }
  }
  return parts.length ? parts.join(' · ') : '—'
}
