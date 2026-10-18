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

/** 從 overview `data` 寬物件推斷全庫計數（多鍵名 fallback）。 */
export function extractKnowledgeOverviewTotals(data: Record<string, unknown>): KnowledgeOverviewTotals {
  const totals = isRecord(data.totals) ? data.totals : null
  const summary = isRecord(data.summary) ? data.summary : null

  const chunks = pickFromRecord(data, ['total_chunks', 'chunk_count', 'chunks'])
    ?? (totals ? pickFromRecord(totals, ['chunks', 'total_chunks', 'chunk_count']) : null)
    ?? (summary ? pickFromRecord(summary, ['chunks', 'total_chunks']) : null)

  const documents = pickFromRecord(data, ['total_documents', 'document_count', 'documents'])
    ?? (totals ? pickFromRecord(totals, ['documents', 'total_documents', 'document_count']) : null)
    ?? (summary ? pickFromRecord(summary, ['documents', 'total_documents']) : null)

  let datasetsActive = pickFromRecord(data, ['datasets_active', 'active_datasets'])
    ?? (totals ? pickFromRecord(totals, ['datasets_active', 'active']) : null)

  const byStatus = data.datasets_by_status ?? data.dataset_status_counts ?? totals?.datasets_by_status
  if (datasetsActive === null && isRecord(byStatus)) {
    datasetsActive = readNumber(byStatus.active)
  }

  if (datasetsActive === null && Array.isArray(data.datasets)) {
    datasetsActive = data.datasets.filter((row) => {
      if (!isRecord(row)) {
        return false
      }
      const status = row.status ?? row.dataset_status
      return status === 'active'
    }).length
  }

  return { chunks, documents, datasetsActive }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function readConfigTopK(config: Record<string, unknown> | null): number | null {
  if (!config) {
    return null
  }
  return pickFromRecord(config, ['top_k', 'retrieval_top_k', 'default_top_k', 'preview_top_k'])
}
