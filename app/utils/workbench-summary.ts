/**
 * Wave-1 總覽計數：既有 list API 陣列長度累加（無專用 count／overview endpoint）。
 */

export const WORKBENCH_LIST_PAGE_SIZE = 50
export const WORKBENCH_LIST_MAX_PAGES = 40

export type WorkbenchMetricKey
  = 'awaitingReview'
    | 'confirmedOrders'
    | 'unpaidOrders'
    | 'reviewedCases'
    | 'membersWithOrders'
    | 'pendingChunks'

export type WorkbenchMetric = {
  key: WorkbenchMetricKey
  value: number | null
  failed: boolean
}

/** 分頁拉至盡頭，回傳累加長度。短頁或缺頁即停。 */
export async function countPagedList(
  fetchPage: (offset: number, limit: number) => Promise<readonly unknown[]>,
  pageSize: number = WORKBENCH_LIST_PAGE_SIZE,
  maxPages: number = WORKBENCH_LIST_MAX_PAGES
): Promise<number> {
  const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : WORKBENCH_LIST_PAGE_SIZE
  const pages = Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : WORKBENCH_LIST_MAX_PAGES
  let total = 0
  let offset = 0
  for (let i = 0; i < pages; i += 1) {
    const batch = await fetchPage(offset, size)
    const length = Array.isArray(batch) ? batch.length : 0
    total += length
    if (length < size) {
      break
    }
    offset += length
  }
  return total
}

export function settledCount(result: PromiseSettledResult<number>): Pick<WorkbenchMetric, 'value' | 'failed'> {
  if (result.status === 'fulfilled' && typeof result.value === 'number' && Number.isFinite(result.value)) {
    return { value: result.value, failed: false }
  }
  return { value: null, failed: true }
}
