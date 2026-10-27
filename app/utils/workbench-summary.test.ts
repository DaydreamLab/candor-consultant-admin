import { describe, expect, it, vi } from 'vitest'
import { countPagedList, settledCount, WORKBENCH_LIST_PAGE_SIZE } from './workbench-summary'

describe('countPagedList', () => {
  it('sums full pages then stops on a short page', async () => {
    const fetchPage = vi.fn(async (offset: number, limit: number) => {
      if (offset === 0) {
        return Array.from({ length: limit }, (_, i) => i)
      }
      if (offset === limit) {
        return Array.from({ length: 3 }, (_, i) => i)
      }
      return []
    })
    await expect(countPagedList(fetchPage, 50)).resolves.toBe(53)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 50)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 50, 50)
  })

  it('returns 0 for an empty first page', async () => {
    const fetchPage = vi.fn(async () => [])
    await expect(countPagedList(fetchPage)).resolves.toBe(0)
    expect(fetchPage).toHaveBeenCalledWith(0, WORKBENCH_LIST_PAGE_SIZE)
  })
})

describe('settledCount', () => {
  it('maps fulfilled numbers and rejected results', () => {
    expect(settledCount({ status: 'fulfilled', value: 4 })).toEqual({ value: 4, failed: false })
    expect(settledCount({ status: 'rejected', reason: new Error('x') })).toEqual({ value: null, failed: true })
  })
})
