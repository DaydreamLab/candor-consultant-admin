/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { adminListKnowledgeChunks, compactKnowledgeChunkQuery } from '~/utils/admin-api'
import {
  buildKnowledgeChunkListQuery,
  knowledgeChunkListHasMore,
  KNOWLEDGE_CHUNK_DEFAULT_STATUS,
  KNOWLEDGE_CHUNK_PAGE_SIZE
} from '~/utils/knowledge-chunks-query'

describe('compactKnowledgeChunkQuery', () => {
  it('omits empty group and status', () => {
    expect(compactKnowledgeChunkQuery({})).toEqual({})
    expect(compactKnowledgeChunkQuery({ group: '  ', status: undefined })).toEqual({})
  })

  it('passes group and status when set', () => {
    expect(compactKnowledgeChunkQuery({ group: 'fda', status: 'pending' })).toEqual({
      group: 'fda',
      status: 'pending'
    })
  })

  it('passes status alone for pending filter', () => {
    expect(compactKnowledgeChunkQuery({ status: 'pending' })).toEqual({ status: 'pending' })
  })

  it('passes limit and offset when set', () => {
    expect(compactKnowledgeChunkQuery({ status: 'pending', limit: 50, offset: 100 })).toEqual({
      status: 'pending',
      limit: 50,
      offset: 100
    })
  })

  it('passes cursor when set (forward-compat)', () => {
    expect(compactKnowledgeChunkQuery({ status: 'pending', limit: 50, cursor: 'abc' })).toEqual({
      status: 'pending',
      limit: 50,
      cursor: 'abc'
    })
  })

  it('omits non-positive limit and negative offset', () => {
    expect(compactKnowledgeChunkQuery({ limit: 0, offset: -1 })).toEqual({})
  })
})

describe('buildKnowledgeChunkListQuery', () => {
  it('omits status when filter is all', () => {
    expect(buildKnowledgeChunkListQuery({ filterStatus: 'all', group: 'fda' })).toEqual({
      group: 'fda'
    })
  })

  it('includes status when a review status is selected', () => {
    expect(buildKnowledgeChunkListQuery({ filterStatus: 'pending' })).toEqual({
      status: 'pending'
    })
  })

  it('includes limit and offset for API paging', () => {
    expect(
      buildKnowledgeChunkListQuery({
        filterStatus: KNOWLEDGE_CHUNK_DEFAULT_STATUS,
        limit: KNOWLEDGE_CHUNK_PAGE_SIZE,
        offset: 50
      })
    ).toEqual({
      status: 'pending',
      limit: 50,
      offset: 50
    })
  })

  it('includes cursor when provided without inventing one', () => {
    expect(
      buildKnowledgeChunkListQuery({
        filterStatus: 'pending',
        limit: 50,
        cursor: ' next '
      })
    ).toEqual({
      status: 'pending',
      limit: 50,
      cursor: 'next'
    })
    expect(
      buildKnowledgeChunkListQuery({
        filterStatus: 'pending',
        limit: 50,
        cursor: '   '
      })
    ).toEqual({
      status: 'pending',
      limit: 50
    })
  })
})

describe('knowledgeChunkListHasMore', () => {
  it('treats a full page as hasMore and a short page as done', () => {
    expect(knowledgeChunkListHasMore(KNOWLEDGE_CHUNK_PAGE_SIZE)).toBe(true)
    expect(knowledgeChunkListHasMore(KNOWLEDGE_CHUNK_PAGE_SIZE - 1)).toBe(false)
    expect(knowledgeChunkListHasMore(0)).toBe(false)
  })
})

describe('adminListKnowledgeChunks query wiring', () => {
  it('forwards status, limit, and offset on the $fetch query object', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 'success',
      data: [
        {
          id: 'chunk-pending-1',
          review_status: 'pending',
          text_preview: 'pending body',
          source_url: 'https://example.com/doc',
          license: 'CC-BY',
          attribution: 'Example Org'
        }
      ]
    }))
    vi.stubGlobal('$fetch', fetchMock)

    const rows = await adminListKnowledgeChunks('https://api.example', 'tok', {
      status: 'pending',
      group: 'fda',
      limit: 50,
      offset: 0
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.review_status).toBe('pending')
    expect(rows[0]?.source_url).toBe('https://example.com/doc')
    expect(rows[0]?.license).toBe('CC-BY')
    expect(rows[0]?.attribution).toBe('Example Org')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0] as unknown as [string, { query: Record<string, string | number> }]
    expect(call[1].query).toEqual({
      group: 'fda',
      status: 'pending',
      limit: 50,
      offset: 0
    })

    vi.unstubAllGlobals()
  })

  it('tolerates missing source_url / license / attribution', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 'success',
      data: [
        {
          id: 'chunk-plain',
          review_status: 'pending',
          text_preview: 'no provenance yet'
        }
      ]
    }))
    vi.stubGlobal('$fetch', fetchMock)

    const rows = await adminListKnowledgeChunks('https://api.example', 'tok', {
      status: 'pending',
      limit: 50,
      offset: 0
    })

    expect(rows[0]?.source_url).toBeNull()
    expect(rows[0]?.license).toBeNull()
    expect(rows[0]?.attribution).toBeNull()

    vi.unstubAllGlobals()
  })

  it('maps OpenAPI chunk_type onto chunk_kind for summary labels', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 'success',
      data: [
        {
          id: 'chunk-summary',
          review_status: 'pending',
          text_preview: 'summary body',
          chunk_type: 'summary'
        }
      ]
    }))
    vi.stubGlobal('$fetch', fetchMock)

    const rows = await adminListKnowledgeChunks('https://api.example', 'tok', {
      status: 'pending',
      limit: 50,
      offset: 0
    })

    expect(rows[0]?.chunk_kind).toBe('summary')
    vi.unstubAllGlobals()
  })
})

describe('knowledge.chunks empty copy', () => {
  it('uses generic empty wording without the beta approved disclaimer', () => {
    for (const file of ['zh-TW.json', 'en.json']) {
      const json = JSON.parse(
        readFileSync(new URL(`../../i18n/locales/${file}`, import.meta.url), 'utf8')
      ) as {
        knowledge: {
          chunks: {
            emptyTitle: string
            empty: string
            loadMore: string
            pendingFilterEmpty?: string
            pendingFilterEmptyTitle?: string
            columns: {
              sourceUrl: string
              license: string
              attribution: string
            }
          }
        }
      }
      const chunks = json.knowledge.chunks
      expect(chunks.pendingFilterEmpty).toBeUndefined()
      expect(chunks.pendingFilterEmptyTitle).toBeUndefined()
      expect(chunks.emptyTitle).toMatch(/沒有符合的片段|No matching chunks/)
      expect(chunks.loadMore).toMatch(/載入更多|Load more/)
      expect(chunks.columns.sourceUrl).toMatch(/來源|Source/)
      expect(chunks.columns.license).toMatch(/授權|License/)
      expect(chunks.columns.attribution).toMatch(/出處|Attribution/)
      expect(JSON.stringify(chunks)).not.toMatch(/beta|全數 approved|expected when all are approved/i)
    }
  })
})
