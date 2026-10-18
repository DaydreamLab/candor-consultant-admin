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
    keys: ['embedding_dimensions', 'vector_dimensions', 'dimensions', 'dimension'],
    section: 'embedding',
    labelKey: 'knowledge.config.fields.embeddingDimensions.label',
    descKey: 'knowledge.config.fields.embeddingDimensions.desc'
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
    keys: ['min_score', 'min_relevance_score', 'score_threshold', 'minimum_score'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.minScore.label',
    descKey: 'knowledge.config.fields.minScore.desc'
  },
  {
    keys: ['default_review_mode', 'review_mode'],
    section: 'retrieval',
    labelKey: 'knowledge.config.fields.reviewMode.label',
    descKey: 'knowledge.config.fields.reviewMode.desc'
  },
  {
    keys: ['corpus', 'corpora', 'allowed_corpora', 'searchable_corpora', 'active_corpus'],
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

export function buildKnowledgeConfigSections(config: Record<string, unknown>): KnowledgeConfigSection[] {
  const usedKeys = new Set<string>()
  const sectionRows: Record<KnowledgeConfigSectionId, KnowledgeConfigDisplayRow[]> = {
    embedding: [],
    retrieval: [],
    corpus: [],
    service: [],
    other: []
  }

  for (const def of KNOWLEDGE_CONFIG_FIELD_DEFS) {
    const picked = pickConfigValue(config, def.keys)
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

  for (const [key, value] of Object.entries(config)) {
    if (usedKeys.has(key) || isSecretKey(key)) {
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
