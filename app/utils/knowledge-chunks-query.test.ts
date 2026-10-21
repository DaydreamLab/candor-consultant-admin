/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { adminListKnowledgeChunks, compactKnowledgeChunkQuery } from '~/utils/admin-api'
import { buildKnowledgeChunkListQuery } from '~/utils/knowledge-chunks-query'

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
})

describe('adminListKnowledgeChunks query wiring', () => {
  it('forwards status on the $fetch query object', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 'success',
      data: [
        {
          id: 'chunk-pending-1',
          review_status: 'pending',
          text_preview: 'pending body'
        }
      ]
    }))
    vi.stubGlobal('$fetch', fetchMock)

    const rows = await adminListKnowledgeChunks('https://api.example', 'tok', {
      status: 'pending',
      group: 'fda'
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.review_status).toBe('pending')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0] as unknown as [string, { query: Record<string, string> }]
    expect(call[1].query).toEqual({ group: 'fda', status: 'pending' })

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
            pendingFilterEmpty?: string
            pendingFilterEmptyTitle?: string
          }
        }
      }
      const chunks = json.knowledge.chunks
      expect(chunks.pendingFilterEmpty).toBeUndefined()
      expect(chunks.pendingFilterEmptyTitle).toBeUndefined()
      expect(chunks.emptyTitle).toMatch(/沒有符合的片段|No matching chunks/)
      expect(JSON.stringify(chunks)).not.toMatch(/beta|全數 approved|expected when all are approved/i)
    }
  })
})
