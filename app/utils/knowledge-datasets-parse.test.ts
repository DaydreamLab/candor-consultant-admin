/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest'
import { adminListKnowledgeDatasets } from '~/utils/admin-api'

describe('adminListKnowledgeDatasets parsing', () => {
  it('maps default_review_mode and attribution from list rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 'success',
      data: [
        {
          id: 'ds-1',
          code: 'fda-daily-value',
          name: 'FDA Daily Value',
          status: 'active',
          default_review_mode: 'manual',
          attribution: 'U.S. FDA',
          chunk_count: 3
        },
        {
          id: 'ds-2',
          code: 'official-seed',
          name: 'Official',
          status: 'active',
          review_mode: 'auto_approve',
          attribution: null,
          chunk_count: 10
        }
      ]
    })
    vi.stubGlobal('$fetch', fetchMock)

    const rows = await adminListKnowledgeDatasets('https://api.example', 'tok')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      default_review_mode: 'manual',
      attribution: 'U.S. FDA'
    })
    expect(rows[1]).toMatchObject({
      default_review_mode: 'auto_approve',
      attribution: null
    })
  })
})
