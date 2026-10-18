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
}

export type KnowledgeChunkListQuery = {
  group?: string
}
