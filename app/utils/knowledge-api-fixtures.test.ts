/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildKnowledgeConfigSections, flattenKnowledgeConfig } from '~/utils/knowledge-config-display'
import { resolveKnowledgeGroupKey } from '~/utils/knowledge-field-parse'
import {
  extractKnowledgeOverviewTotals,
  readConfigTopK
} from '~/utils/knowledge-overview'
import {
  normalizeRetrievalHit,
  parseKnowledgeGapPayload,
  parseRetrievalHits,
  retrievalHitDatasetLabel,
  retrievalHitIsRescue,
  retrievalHitScoreLines,
  retrievalHitSourceLabel
} from '~/utils/knowledge-retrieval-parse'

const fixtures = JSON.parse(
  readFileSync(new URL('../../test/fixtures/knowledge-live-samples.json', import.meta.url), 'utf8')
) as {
  datasetRow: Record<string, unknown>
  overview: Record<string, unknown>
  config: Record<string, unknown>
  retrievalGap: Record<string, unknown>
  retrievalHit: Record<string, unknown>
}

describe('resolveKnowledgeGroupKey', () => {
  it('reads API group when group_key is absent', () => {
    expect(resolveKnowledgeGroupKey(fixtures.datasetRow)).toBe('fda')
    expect(resolveKnowledgeGroupKey({ group_key: 'ods', group: 'fda' })).toBe('ods')
  })
})

describe('extractKnowledgeOverviewTotals', () => {
  it('reads chunks_total and documents_total from live overview', () => {
    const totals = extractKnowledgeOverviewTotals(fixtures.overview)
    expect(totals).toEqual({
      chunks: 1262,
      documents: 72,
      datasetsActive: 38
    })
  })
})

describe('knowledge config display', () => {
  it('flattens nested search.default_top_k and avoids raw JSON blobs', () => {
    const flat = flattenKnowledgeConfig(fixtures.config)
    expect(flat.default_top_k).toBe(5)
    expect(flat.min_vector_similarity).toBe(0.6)
    expect(flat.embedding_provider).toBe('http')
    const sections = buildKnowledgeConfigSections(fixtures.config)
    const displays = sections.flatMap(section => section.rows.map(row => row.display))
    expect(displays.some(text => text.startsWith('{'))).toBe(false)
    expect(readConfigTopK(fixtures.config)).toBe(5)
  })
})

describe('retrieval preview parsing', () => {
  it('reads knowledge_gap from query_info', () => {
    const gap = parseKnowledgeGapPayload(fixtures.retrievalGap)
    expect(gap?.reason).toBe('no_matching_hits')
  })

  it('maps document source and scores from live hit shape', () => {
    const hits = parseRetrievalHits({ results: [fixtures.retrievalHit] })
    expect(hits).toHaveLength(1)
    const hit = hits[0]!
    expect(retrievalHitDatasetLabel(hit)).toBeNull()
    expect(retrievalHitSourceLabel(hit)).toContain('葉酸')
    expect(retrievalHitIsRescue(hit)).toBe(true)
    const lines = retrievalHitScoreLines(hit)
    expect(lines.find(line => line.key === 'rrf')).toBeUndefined()
    const normalized = normalizeRetrievalHit(fixtures.retrievalHit)
    expect(normalized.document_source_name).toContain('HPA')
    expect(normalized.score_rrf).toBe(0)
  })
})
