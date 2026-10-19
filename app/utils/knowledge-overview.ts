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

const DATASET_LIST_KEYS = [
  'datasets',
  'items',
  'dataset_summaries',
  'dataset_overview',
  'public_datasets',
  'knowledge_datasets'
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** 從 overview `data` 取出資料集列（多鍵名 fallback）。 */
export function extractOverviewDatasetRows(data: Record<string, unknown>): Record<string, unknown>[] {
  for (const key of DATASET_LIST_KEYS) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value.filter(row => row && typeof row === 'object') as Record<string, unknown>[]
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
