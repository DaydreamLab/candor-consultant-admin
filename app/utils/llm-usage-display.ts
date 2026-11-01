import type {
  LlmUsageByCategoryModel,
  LlmUsageByModel,
  LlmUsageSummaryPayload
} from '~/utils/admin-api'

export const LLM_USAGE_CATEGORY_ORDER = ['chat', 'report', 'decision', 'other'] as const

export type LlmUsageDetailRow = {
  kind: 'group' | 'model' | 'total'
  key: string
  label: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  /** 已知成本加總（字串已格式化）；未知列為 null。 */
  estimated_cost_usd: string | null
  /** 列內是否含未知單價（顯示 * 或「未知」）。 */
  cost_incomplete: boolean
  /** model 列且單價未知時，成本欄顯示「未知」。 */
  cost_unknown_label: boolean
}

export type LlmUsageCategoryGroup = {
  category: string
  rows: LlmUsageByCategoryModel[]
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_usd: string | null
  cost_incomplete: boolean
}

function sumNullableUsd(amounts: Array<string | null>): string | null {
  let sum = 0
  let any = false
  for (const amount of amounts) {
    if (amount === null || amount === undefined || amount === '') {
      continue
    }
    const n = Number(amount)
    if (!Number.isFinite(n)) {
      continue
    }
    sum += n
    any = true
  }
  return any ? sum.toFixed(4) : null
}

export function formatLlmUsageTokens(n: number): string {
  return Math.max(0, Math.trunc(n)).toLocaleString('en-US')
}

/** 顯示用 USD：`US$0.142`；incomplete 時加 `*`；無數字且 incomplete 時只留 `*` 語意由呼叫端處理。 */
export function formatLlmUsageUsd(
  amount: string | null | undefined,
  incomplete: boolean
): string | null {
  if (amount === null || amount === undefined || amount === '') {
    return null
  }
  const n = Number(amount)
  const body = Number.isFinite(n) ? `US$${trimUsd(n)}` : `US$${amount}`
  return incomplete ? `${body}*` : body
}

function trimUsd(n: number): string {
  const fixed = n.toFixed(4)
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export function totalTokensOf(summary: LlmUsageSummaryPayload): number {
  return summary.input_tokens + summary.output_tokens
}

/**
 * 頂層成本：優先用 API `estimated_cost_usd`；
 * `cost_complete=false` 且為 null 時，改加總細節列已知成本（不自行套價，只加總回傳值）。
 */
export function displayTotalCostUsd(summary: LlmUsageSummaryPayload): {
  amount: string | null
  incomplete: boolean
} {
  const incomplete = !summary.cost_complete
  if (summary.estimated_cost_usd !== null) {
    return { amount: summary.estimated_cost_usd, incomplete }
  }
  if (!incomplete) {
    return { amount: '0.0000', incomplete: false }
  }
  const fromCategory = sumNullableUsd(
    summary.by_category_model
      .filter(row => row.cost_known)
      .map(row => row.estimated_cost_usd)
  )
  if (fromCategory !== null) {
    return { amount: fromCategory, incomplete: true }
  }
  const fromModel = sumNullableUsd(
    summary.by_model
      .filter(row => row.cost_known)
      .map(row => row.estimated_cost_usd)
  )
  return { amount: fromModel, incomplete: true }
}

export function groupByCategoryModel(
  rows: LlmUsageByCategoryModel[]
): LlmUsageCategoryGroup[] {
  const buckets = new Map<string, LlmUsageByCategoryModel[]>()
  for (const row of rows) {
    const list = buckets.get(row.category)
    if (list) {
      list.push(row)
    } else {
      buckets.set(row.category, [row])
    }
  }
  const ordered = [
    ...LLM_USAGE_CATEGORY_ORDER.filter(cat => buckets.has(cat)),
    ...[...buckets.keys()].filter(
      cat => !(LLM_USAGE_CATEGORY_ORDER as readonly string[]).includes(cat)
    ).sort()
  ]
  return ordered.map((category) => {
    const groupRows = buckets.get(category) ?? []
    const cost_incomplete = groupRows.some(row => !row.cost_known)
    return {
      category,
      rows: groupRows,
      input_tokens: groupRows.reduce((sum, row) => sum + row.input_tokens, 0),
      output_tokens: groupRows.reduce((sum, row) => sum + row.output_tokens, 0),
      cache_read_tokens: groupRows.reduce((sum, row) => sum + row.cache_read_tokens, 0),
      cache_write_tokens: groupRows.reduce((sum, row) => sum + row.cache_write_tokens, 0),
      estimated_cost_usd: sumNullableUsd(
        groupRows.filter(row => row.cost_known).map(row => row.estimated_cost_usd)
      ),
      cost_incomplete
    }
  })
}

export function buildLlmUsageDetailRows(
  summary: LlmUsageSummaryPayload,
  labels: {
    category: (category: string) => string
    model: (model: string) => string
    total: string
  }
): LlmUsageDetailRow[] {
  const out: LlmUsageDetailRow[] = []
  if (summary.by_category_model.length) {
    for (const group of groupByCategoryModel(summary.by_category_model)) {
      out.push({
        kind: 'group',
        key: `group:${group.category}`,
        label: labels.category(group.category),
        input_tokens: group.input_tokens,
        output_tokens: group.output_tokens,
        cache_read_tokens: group.cache_read_tokens,
        cache_write_tokens: group.cache_write_tokens,
        estimated_cost_usd: group.estimated_cost_usd,
        cost_incomplete: group.cost_incomplete,
        cost_unknown_label: false
      })
      for (const [index, row] of group.rows.entries()) {
        out.push(modelDetailRow(row, `cat:${group.category}:${row.model}:${index}`, labels.model))
      }
    }
  } else {
    for (const [index, row] of summary.by_model.entries()) {
      out.push(modelDetailRow(row, `model:${row.model}:${index}`, labels.model))
    }
  }

  const totalCost = displayTotalCostUsd(summary)
  out.push({
    kind: 'total',
    key: 'total',
    label: labels.total,
    input_tokens: summary.input_tokens,
    output_tokens: summary.output_tokens,
    cache_read_tokens: summary.cache_read_tokens,
    cache_write_tokens: summary.cache_write_tokens,
    estimated_cost_usd: totalCost.amount,
    cost_incomplete: totalCost.incomplete,
    cost_unknown_label: false
  })
  return out
}

function modelDetailRow(
  row: LlmUsageByModel,
  key: string,
  modelLabel: (model: string) => string
): LlmUsageDetailRow {
  return {
    kind: 'model',
    key,
    label: modelLabel(row.model),
    input_tokens: row.input_tokens,
    output_tokens: row.output_tokens,
    cache_read_tokens: row.cache_read_tokens,
    cache_write_tokens: row.cache_write_tokens,
    estimated_cost_usd: row.cost_known ? row.estimated_cost_usd : null,
    cost_incomplete: !row.cost_known,
    cost_unknown_label: !row.cost_known
  }
}

export function hasLlmUsageDetails(summary: LlmUsageSummaryPayload | null): boolean {
  if (!summary) {
    return false
  }
  return summary.by_category_model.length > 0 || summary.by_model.length > 0
}
