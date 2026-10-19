/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildKnowledgeDatasetLookup,
  knowledgeGapDetailRows,
  parseKnowledgeGapPayload,
  parseRetrievalHits,
  retrievalHitDatasetDisplay,
  representedNutrientsForPreview,
  retrievalHitDatasetLabel,
  retrievalHitIsRescue,
  retrievalHitScoreLines
} from './knowledge-retrieval-parse'
import type { KnowledgeDataset } from '~/types/knowledge'

const fixtures = JSON.parse(
  readFileSync(new URL('../../test/fixtures/knowledge-live-samples.json', import.meta.url), 'utf8')
) as {
  retrievalGap: Record<string, unknown>
  retrievalHit: Record<string, unknown>
  retrievalHitWithDataset: Record<string, unknown>
  retrievalHitDatasetIdOnly: Record<string, unknown>
  retrievalBComplex: Record<string, unknown>
  datasetRow: Record<string, unknown>
}

describe('knowledgeGapDetailRows', () => {
  it('formats reason and message without raw JSON', () => {
    const gap = parseKnowledgeGapPayload(fixtures.retrievalGap)
    expect(gap).toBeTruthy()
    const rows = knowledgeGapDetailRows(gap!, reason => `label:${reason}`)
    expect(rows.map(row => row.value)).toContain('label:no_matching_hits')
    expect(rows.some(row => row.value.includes('公開參考知識庫'))).toBe(true)
  })

  it('localizes nutrient_keys when formatter is provided', () => {
    const gap = parseKnowledgeGapPayload(fixtures.retrievalGap)
    const rows = knowledgeGapDetailRows(gap!, reason => reason, key => `nutrient:${key}`)
    const nutrientRow = rows.find(row => row.labelKey.includes('nutrientKeys'))
    expect(nutrientRow?.value).toBe('nutrient:copper')
  })
})

describe('retrievalHitDatasetLabel', () => {
  const lookup = buildKnowledgeDatasetLookup([fixtures.datasetRow as KnowledgeDataset])

  it('prefers nested dataset name and code over document source', () => {
    const hit = parseRetrievalHits({ results: [fixtures.retrievalHitWithDataset] })[0]!
    expect(retrievalHitDatasetLabel(hit)).toBe('HPA 葉酸 DRI8 (hpa-dri8-folate-zh)')
  })

  it('resolves dataset_id via dataset list lookup', () => {
    const hit = parseRetrievalHits({ results: [fixtures.retrievalHitDatasetIdOnly] })[0]!
    expect(retrievalHitDatasetLabel(hit)).toBeNull()
    expect(retrievalHitDatasetLabel(hit, lookup)).toBe(
      'FDA Daily Value on the Nutrition and Supplement Facts Labels (fda-daily-value)'
    )
  })

  it('shows em dash when no dataset identity is available', () => {
    const hit = parseRetrievalHits({ results: [fixtures.retrievalHit] })[0]!
    expect(retrievalHitDatasetDisplay(hit)).toBe('—')
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

describe('representedNutrientsForPreview', () => {
  it('falls back to detected_nutrients when hits exist but represented is omitted', () => {
    const info = {
      detected_nutrients: ['sodium', 'iodine'],
      represented_nutrients: undefined
    }
    expect(representedNutrientsForPreview(info, 3)).toEqual(['sodium', 'iodine'])
  })

  it('prefers represented_nutrients for partial multi-nutrient queries', () => {
    const info = fixtures.retrievalBComplex.query_info as Record<string, unknown>
    const list = representedNutrientsForPreview(info, 1)
    expect(list).toEqual(info.represented_nutrients)
  })

  it('returns empty when there are no hits', () => {
    const info = { detected_nutrients: ['copper'] }
    expect(representedNutrientsForPreview(info, 0)).toEqual([])
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
