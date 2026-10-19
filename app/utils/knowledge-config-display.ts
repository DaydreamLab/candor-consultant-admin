export type KnowledgeConfigSectionId = 'embedding' | 'retrieval' | 'corpus' | 'service' | 'other'

export type KnowledgeConfigFieldDef = {
  keys: string[]
  section: KnowledgeConfigSectionId
  labelKey: string
  descKey: string
}

export const KNOWLEDGE_CONFIG_FIELD_DEFS: KnowledgeConfigFieldDef[] = [
  {
    keys: ['embedding_provider', 'embedding_vendor', 'provider'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.embeddingProvider.label',
    descKey: 'knowledge.config.fields.embeddingProvider.desc'
  },
  {
    keys: ['embedding_model', 'model', 'embedding_model_name'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.embeddingModel.label',
    descKey: 'knowledge.config.fields.embeddingModel.desc'
  },
  {
    keys: ['embedding_dimensions', 'vector_dimensions', 'dimensions', 'dimension', 'active_space_dim'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.embeddingDimensions.label',
    descKey: 'knowledge.config.fields.embeddingDimensions.desc'
  },
  {
    keys: ['embedding_third_party'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.embeddingThirdParty.label',
    descKey: 'knowledge.config.fields.embeddingThirdParty.desc'
  },
  {
    keys: ['active_space_name'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.activeSpaceName.label',
    descKey: 'knowledge.config.fields.activeSpaceName.desc'
  },
  {
    keys: ['active_space_vector_table'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.activeSpaceTable.label',
    descKey: 'knowledge.config.fields.activeSpaceTable.desc'
  },
  {
    keys: ['active_space_status'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.activeSpaceStatus.label',
    descKey: 'knowledge.config.fields.activeSpaceStatus.desc'
  },
  {
    keys: ['active_space', 'vector_space', 'pinecone_namespace'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.activeSpace.label',
    descKey: 'knowledge.config.fields.activeSpace.desc'
  },
  {
    keys: ['top_k', 'retrieval_top_k', 'default_top_k'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.topK.label',
    descKey: 'knowledge.config.fields.topK.desc'
  },
  {
    keys: ['default_candidates'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.defaultCandidates.label',
    descKey: 'knowledge.config.fields.defaultCandidates.desc'
  },
  {
    keys: ['rrf_k'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.rrfK.label',
    descKey: 'knowledge.config.fields.rrfK.desc'
  },
  {
    keys: ['min_vector_similarity', 'min_score', 'min_relevance_score', 'score_threshold', 'minimum_score'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.minScore.label',
    descKey: 'knowledge.config.fields.minScore.desc'
  },
  {
    keys: ['filter_whitelist'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.filterWhitelist.label',
    descKey: 'knowledge.config.fields.filterWhitelist.desc'
  },
  {
    keys: ['default_review_mode', 'review_mode'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.reviewMode.label',
    descKey: 'knowledge.config.fields.reviewMode.desc'
  },
  {
    keys: ['corpus', 'allowed_corpora', 'searchable_corpora', 'active_corpus'],
    section: 'corpus',
    labelKey: 'knowledge.config.fields.corpus.label',
    descKey: 'knowledge.config.fields.corpus.desc'
  },
  {
    keys: ['allow_third_party_default', 'default_allow_third_party'],
    section: 'service',
    labelKey: 'knowledge.config.fields.allowThirdPartyDefault.label',
    descKey: 'knowledge.config.fields.allowThirdPartyDefault.desc'
  }
]

export type KnowledgeConfigDisplayRow = {
  key: string
  labelKey: string
  descKey: string
  value: unknown
  display: string
}

export type KnowledgeConfigSection = {
  id: KnowledgeConfigSectionId
  titleKey: string
  rows: KnowledgeConfigDisplayRow[]
}

const NESTED_CONFIG_KEYS = new Set(['embedding', 'active_space', 'search', 'corpora'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase()
  return lower.includes('key') || lower.includes('secret') || lower.includes('token') || lower.includes('password')
}

export function formatConfigValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (Array.isArray(value)) {
    return value.map(item => String(item)).join(', ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function pickConfigValue(config: Record<string, unknown>, keys: string[]): { key: string, value: unknown } | null {
  for (const key of keys) {
    if (key in config) {
      return { key, value: config[key] }
    }
  }
  return null
}

/** 將巢狀 GET /knowledge/config 攤平一層，供欄位化顯示。 */
export function flattenKnowledgeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {}
  const embedding = isRecord(config.embedding) ? config.embedding : null
  if (embedding) {
    if (embedding.provider != null) {
      flat.embedding_provider = embedding.provider
    }
    if (embedding.model != null) {
      flat.embedding_model = embedding.model
    }
    if (embedding.dimensions != null) {
      flat.embedding_dimensions = embedding.dimensions
    }
    if (embedding.third_party != null) {
      flat.embedding_third_party = embedding.third_party
    }
  }
  const space = isRecord(config.active_space) ? config.active_space : null
  if (space) {
    if (space.name != null) {
      flat.active_space_name = space.name
    }
    if (space.vector_table != null) {
      flat.active_space_vector_table = space.vector_table
    }
    if (space.status != null) {
      flat.active_space_status = space.status
    }
    if (space.model != null && flat.embedding_model == null) {
      flat.embedding_model = space.model
    }
    if (space.dim != null) {
      flat.active_space_dim = space.dim
    }
  }
  const search = isRecord(config.search) ? config.search : null
  if (search) {
    if (search.default_top_k != null) {
      flat.default_top_k = search.default_top_k
    }
    if (search.default_candidates != null) {
      flat.default_candidates = search.default_candidates
    }
    if (search.rrf_k != null) {
      flat.rrf_k = search.rrf_k
    }
    if (search.min_vector_similarity != null) {
      flat.min_vector_similarity = search.min_vector_similarity
    }
    if (search.filter_whitelist != null) {
      flat.filter_whitelist = search.filter_whitelist
    }
  }
  for (const [key, value] of Object.entries(config)) {
    if (!NESTED_CONFIG_KEYS.has(key)) {
      flat[key] = value
    }
  }
  return flat
}

function corpusRows(corpora: unknown[]): KnowledgeConfigDisplayRow[] {
  return corpora
    .filter(isRecord)
    .map((row, index) => {
      const name = typeof row.name === 'string' ? row.name : `corpus-${index + 1}`
      const searchApi = row.search_api === true
      return {
        key: `corpus:${name}`,
        labelKey: 'knowledge.config.fields.corpusEntry.label',
        descKey: 'knowledge.config.fields.corpusEntry.desc',
        value: row,
        display: searchApi ? `${name}（可搜）` : `${name}（不可搜）`
      }
    })
}

export function buildKnowledgeConfigSections(config: Record<string, unknown>): KnowledgeConfigSection[] {
  const flattened = flattenKnowledgeConfig(config)
  const usedKeys = new Set<string>()
  const sectionRows: Record<KnowledgeConfigSectionId, KnowledgeConfigDisplayRow[]> = {
    embedding: [],
    retrieval: [],
    corpus: [],
    service: [],
    other: []
  }

  for (const def of KNOWLEDGE_CONFIG_FIELD_DEFS) {
    const picked = pickConfigValue(flattened, def.keys)
    if (!picked || usedKeys.has(picked.key)) {
      continue
    }
    usedKeys.add(picked.key)
    sectionRows[def.section].push({
      key: picked.key,
      labelKey: def.labelKey,
      descKey: def.descKey,
      value: picked.value,
      display: formatConfigValue(picked.value)
    })
  }

  const corpora = config.corpora
  if (Array.isArray(corpora) && corpora.length) {
    sectionRows.corpus.push(...corpusRows(corpora))
    usedKeys.add('corpora')
  }

  for (const [key, value] of Object.entries(flattened)) {
    if (usedKeys.has(key) || isSecretKey(key) || NESTED_CONFIG_KEYS.has(key)) {
      continue
    }
    usedKeys.add(key)
    sectionRows.other.push({
      key,
      labelKey: 'knowledge.config.fields.unknown.label',
      descKey: 'knowledge.config.fields.unknown.desc',
      value,
      display: formatConfigValue(value)
    })
  }

  const order: KnowledgeConfigSectionId[] = ['embedding', 'retrieval', 'corpus', 'service', 'other']
  return order
    .map(id => ({
      id,
      titleKey: `knowledge.config.sections.${id}`,
      rows: sectionRows[id]
    }))
    .filter(section => section.rows.length > 0)
}
