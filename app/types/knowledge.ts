export type KnowledgeDatasetStatus = 'pending_review' | 'active' | 'disabled'

export type KnowledgeReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'retired'

export type KnowledgeChunksByReviewStatus = Partial<Record<KnowledgeReviewStatus, number>>

export type KnowledgeDataset = {
  id: string
  code: string
  name: string
  corpus?: string | null
  status: KnowledgeDatasetStatus
  group_key?: string | null
  source_url?: string | null
  license?: string | null
  license_url?: string | null
  attribution?: string | null
  allow_third_party?: boolean | null
  document_count?: number | null
  chunk_count?: number | null
  chunks_by_review_status?: KnowledgeChunksByReviewStatus | null
  last_ingested_at?: string | null
}

export type KnowledgeDatasetListQuery = {
  group?: string
  status?: KnowledgeDatasetStatus
  corpus?: string
  code?: string
}

export type KnowledgeDatasetPatch = {
  code?: string
  name?: string
  license?: string
  license_url?: string | null
  attribution?: string | null
  status?: KnowledgeDatasetStatus
  reason?: string
}

export type KnowledgeChunk = {
  id: string
  review_status: KnowledgeReviewStatus
  dataset_id?: string | null
  dataset_code?: string | null
  dataset_name?: string | null
  document_title?: string | null
  text_preview?: string | null
  source_url?: string | null
  license?: string | null
  attribution?: string | null
  chunk_kind?: string | null
  group_key?: string | null
  reject_reason?: string | null
}

export type KnowledgeChunkListQuery = {
  group?: string
  /** Backend query `status` (review_status values). Invalid values → 422. */
  status?: KnowledgeReviewStatus
}

export type KnowledgeRetrievalMode = 'keyword' | 'vector' | 'hybrid'

export type KnowledgeGapReason = 'no_matching_hits' | 'insufficient_multi_nutrient_hits' | 'partial_multi_nutrient_hits'

export type KnowledgeRetrievalPreviewRequest = {
  corpus: 'public_knowledge'
  query: string
  mode?: KnowledgeRetrievalMode
  top_k?: number
  filters?: Record<string, unknown>
}

export type KnowledgeRetrievalPreviewResult = {
  hits: Record<string, unknown>[]
  query_info: Record<string, unknown> | null
  knowledge_gap: Record<string, unknown> | null
  raw: Record<string, unknown>
}

export type KnowledgeAuditListQuery = {
  from?: string
  to?: string
  action?: string
  actor_id?: string
  limit?: number
  offset?: number
}

export type KnowledgeDatasetGroup = {
  group_key: string
  display_name: string
  sort_order?: number | null
  dataset_count?: number | null
}

export type KnowledgeDatasetGroupCreate = {
  group_key: string
  display_name: string
  reason: string
  sort_order?: number
}

export type KnowledgeAuditEvent = {
  id: string
  source?: string | null
  level?: string | null
  action?: string | null
  actor_id?: string | null
  created_at?: string | null
  dataset_id?: string | null
  chunk_id?: string | null
  raw: Record<string, unknown>
}
