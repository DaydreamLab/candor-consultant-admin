/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  knowledgeGapDetailRows,
  parseKnowledgeGapPayload,
  parseRetrievalHits,
  retrievalHitDatasetLabel,
  retrievalHitIsRescue,
  retrievalHitScoreLines
} from './knowledge-retrieval-parse'

const fixtures = JSON.parse(
  readFileSync(new URL('../../test/fixtures/knowledge-live-samples.json', import.meta.url), 'utf8')
) as {
  retrievalGap: Record<string, unknown>
  retrievalHit: Record<string, unknown>
  retrievalHitWithDataset: Record<string, unknown>
  retrievalBComplex: Record<string, unknown>
}

describe('knowledgeGapDetailRows', () => {
  it('formats reason and message without raw JSON', () => {
    const gap = parseKnowledgeGapPayload(fixtures.retrievalGap)
    expect(gap).toBeTruthy()
    const rows = knowledgeGapDetailRows(gap!, reason => `label:${reason}`)
    expect(rows.map(row => row.value)).toContain('label:no_matching_hits')
    expect(rows.some(row => row.value.includes('公開參考知識庫'))).toBe(true)
  })
})

describe('retrievalHitDatasetLabel', () => {
  it('prefers nested dataset name and code over document source', () => {
    const hit = parseRetrievalHits({ results: [fixtures.retrievalHitWithDataset] })[0]!
    expect(retrievalHitDatasetLabel(hit)).toBe('HPA 葉酸 DRI8 (hpa-dri8-folate-zh)')
  })
})

describe('rescue hits', () => {
  it('hides zero RRF and marks rescue', () => {
    const hit = parseRetrievalHits({ results: [fixtures.retrievalHit] })[0]!
    expect(retrievalHitIsRescue(hit)).toBe(true)
    const lines = retrievalHitScoreLines(hit)
    expect(lines.find(line => line.key === 'rrf')).toBeUndefined()
    expect(lines.find(line => line.key === 'vector')?.missingLabelKey).toBe(
      'knowledge.retrievalPreview.rescueBadge'
    )
  })
})

describe('B群 partial hint', () => {
  it('does not fabricate partial_multi_nutrient_hits when API omits knowledge_gap', () => {
    const gap = parseKnowledgeGapPayload(fixtures.retrievalBComplex)
    expect(gap).toBeNull()
    const info = fixtures.retrievalBComplex.query_info as Record<string, unknown>
    expect(Array.isArray(info.detected_nutrients) && info.detected_nutrients.length).toBe(6)
    expect(info.knowledge_gap).toBeUndefined()
  })
})
