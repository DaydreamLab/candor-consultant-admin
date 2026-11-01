import type {
  LlmUsageByCategoryModel,
  LlmUsageByModel,
  LlmUsageByPurposeModel,
  LlmUsageFx,
  LlmUsageSummaryPayload
} from '~/utils/admin-api'

export const LLM_USAGE_CATEGORY_ORDER = ['chat', 'report', 'decision', 'other'] as const

/** 決策用途中文對照（有無 `decision.` 前綴皆可對到）。 */
export const LLM_USAGE_PURPOSE_LABELS: Record<string, string> = {
  'decision.cta.open_chat': '對話 CTA',
  'cta.open_chat': '對話 CTA',
  'decision.cta.triad_complete': '基本資料問完 CTA',
  'cta.triad_complete': '基本資料問完 CTA',
  'decision.cta.questionnaire_gap': '補問缺漏題',
  'cta.questionnaire_gap': '補問缺漏題',
  'decision.reply_is_asking': '回覆是否在提問',
  'reply_is_asking': '回覆是否在提問',
  'decision.goal_utterance': 'goals 判讀',
  'goal_utterance': 'goals 判讀'
}

export type LlmUsageDetailRow = {
  kind: 'group' | 'purpose' | 'model' | 'total'
  key: string
  label: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  /** 已知成本加總（字串已格式化）；未知列為 null。 */
  estimated_cost_usd: string | null
  /** core 回傳／加總的 TWD；無值時不顯示。 */
  cost_twd: string | null
  /** 列內是否含未知單價（顯示 * 或「未知」）。 */
  cost_incomplete: boolean
  /** model 列且單價未知時，成本欄顯示「未知」。 */
  cost_unknown_label: boolean
  /** purpose／其下 model 用來收合。 */
  purpose_key?: string
}

export type LlmUsageCategoryGroup = {
  category: string
  rows: LlmUsageByCategoryModel[]
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_usd: string | null
  cost_twd: string | null
  cost_incomplete: boolean
}

export type LlmUsagePurposeGroup = {
  purpose: string
  rows: LlmUsageByPurposeModel[]
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_usd: string | null
  cost_twd: string | null
  cost_incomplete: boolean
}

function sumNullableAmount(amounts: Array<string | null>, digits: number): string | null {
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
  return any ? sum.toFixed(digits) : null
}

function sumNullableUsd(amounts: Array<string | null>): string | null {
  return sumNullableAmount(amounts, 4)
}

function sumNullableTwd(amounts: Array<string | null>): string | null {
  return sumNullableAmount(amounts, 2)
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

/** 顯示用 TWD：`NT$4.55`（不自行換算，只格式化 core 回傳值）。 */
export function formatLlmUsageTwd(amount: string | null | undefined): string | null {
  if (amount === null || amount === undefined || amount === '') {
    return null
  }
  const n = Number(amount)
  if (!Number.isFinite(n)) {
    return `NT$${amount}`
  }
  return `NT$${trimTwd(n)}`
}

/**
 * 組合 USD＋可選 NTD。
 * - `cost_twd` 有值且允許顯示 NTD（有可用匯率）→ 並排
 * - 否則只出 USD
 */
export function formatLlmUsageCostPair(opts: {
  usd: string | null | undefined
  twd: string | null | undefined
  incomplete: boolean
  showTwd: boolean
}): string {
  const usd = formatLlmUsageUsd(opts.usd, opts.incomplete)
  const twd = opts.showTwd ? formatLlmUsageTwd(opts.twd) : null
  if (usd && twd) {
    return `${usd} ${twd}`
  }
  if (usd) {
    return usd
  }
  if (twd) {
    return opts.incomplete ? `${twd}*` : twd
  }
  return opts.incomplete ? '*' : 'US$0'
}

function trimUsd(n: number): string {
  const fixed = n.toFixed(4)
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function trimTwd(n: number): string {
  const fixed = n.toFixed(2)
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

export function totalTokensOf(summary: LlmUsageSummaryPayload): number {
  return summary.input_tokens + summary.output_tokens
}

/** 有可用匯率（fx 存在且 rate 非 null）時才並排顯示 NTD。 */
export function canShowLlmUsageTwd(summary: LlmUsageSummaryPayload): boolean {
  return Boolean(summary.fx && summary.fx.rate !== null && summary.fx.rate !== '')
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

/** 頂層 TWD：優先 API `cost_twd`；缺且不完整時加總細節已知 `cost_twd`。 */
export function displayTotalCostTwd(summary: LlmUsageSummaryPayload): string | null {
  if (summary.cost_twd !== null) {
    return summary.cost_twd
  }
  if (summary.cost_complete) {
    return null
  }
  const fromCategory = sumNullableTwd(
    summary.by_category_model
      .filter(row => row.cost_known)
      .map(row => row.cost_twd)
  )
  if (fromCategory !== null) {
    return fromCategory
  }
  return sumNullableTwd(
    summary.by_model
      .filter(row => row.cost_known)
      .map(row => row.cost_twd)
  )
}

export function purposeLabelOf(purpose: string): string {
  const trimmed = purpose.trim()
  if (!trimmed) {
    return trimmed
  }
  if (LLM_USAGE_PURPOSE_LABELS[trimmed]) {
    return LLM_USAGE_PURPOSE_LABELS[trimmed]
  }
  const withoutPrefix = trimmed.startsWith('decision.')
    ? trimmed.slice('decision.'.length)
    : `decision.${trimmed}`
  return LLM_USAGE_PURPOSE_LABELS[withoutPrefix] ?? trimmed
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
    return aggregateCategoryGroup(category, groupRows)
  })
}

function aggregateCategoryGroup(
  category: string,
  groupRows: LlmUsageByCategoryModel[]
): LlmUsageCategoryGroup {
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
    cost_twd: sumNullableTwd(
      groupRows.filter(row => row.cost_known).map(row => row.cost_twd)
    ),
    cost_incomplete
  }
}

export function groupByPurposeModel(
  rows: LlmUsageByPurposeModel[]
): LlmUsagePurposeGroup[] {
  const buckets = new Map<string, LlmUsageByPurposeModel[]>()
  for (const row of rows) {
    const list = buckets.get(row.purpose)
    if (list) {
      list.push(row)
    } else {
      buckets.set(row.purpose, [row])
    }
  }
  // 維持 API 出現順序（不強制排序用途）
  return [...buckets.entries()].map(([purpose, groupRows]) => {
    const cost_incomplete = groupRows.some(row => !row.cost_known)
    return {
      purpose,
      rows: groupRows,
      input_tokens: groupRows.reduce((sum, row) => sum + row.input_tokens, 0),
      output_tokens: groupRows.reduce((sum, row) => sum + row.output_tokens, 0),
      cache_read_tokens: groupRows.reduce((sum, row) => sum + row.cache_read_tokens, 0),
      cache_write_tokens: groupRows.reduce((sum, row) => sum + row.cache_write_tokens, 0),
      estimated_cost_usd: sumNullableUsd(
        groupRows.filter(row => row.cost_known).map(row => row.estimated_cost_usd)
      ),
      cost_twd: sumNullableTwd(
        groupRows.filter(row => row.cost_known).map(row => row.cost_twd)
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
    purpose: (purpose: string) => string
    total: string
  }
): LlmUsageDetailRow[] {
  const out: LlmUsageDetailRow[] = []
  const purposeRows = summary.decision_by_purpose_model
  const hasPurposeBreakdown = purposeRows.length > 0

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
        cost_twd: group.cost_twd,
        cost_incomplete: group.cost_incomplete,
        cost_unknown_label: false
      })

      if (group.category === 'decision' && hasPurposeBreakdown) {
        for (const purposeGroup of groupByPurposeModel(purposeRows)) {
          const purposeKey = `purpose:${purposeGroup.purpose}`
          out.push({
            kind: 'purpose',
            key: purposeKey,
            label: labels.purpose(purposeGroup.purpose),
            input_tokens: purposeGroup.input_tokens,
            output_tokens: purposeGroup.output_tokens,
            cache_read_tokens: purposeGroup.cache_read_tokens,
            cache_write_tokens: purposeGroup.cache_write_tokens,
            estimated_cost_usd: purposeGroup.estimated_cost_usd,
            cost_twd: purposeGroup.cost_twd,
            cost_incomplete: purposeGroup.cost_incomplete,
            cost_unknown_label: false,
            purpose_key: purposeKey
          })
          for (const [index, row] of purposeGroup.rows.entries()) {
            out.push({
              ...modelDetailRow(
                row,
                `purpose:${purposeGroup.purpose}:${row.model}:${index}`,
                labels.model
              ),
              purpose_key: purposeKey
            })
          }
        }
      } else {
        for (const [index, row] of group.rows.entries()) {
          out.push(modelDetailRow(row, `cat:${group.category}:${row.model}:${index}`, labels.model))
        }
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
    cost_twd: displayTotalCostTwd(summary),
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
    cost_twd: row.cost_known ? row.cost_twd : null,
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

/** 牌告日期優先；沒有則用查詢日期（fetched_at）。 */
export function fxDisplayDate(fx: LlmUsageFx): string | null {
  return fx.rate_date || fx.fetched_at || null
}

/**
 * 展開區匯率小字內容（不含 i18n 前綴標籤本身的組句可由呼叫端包）。
 * 無可用 rate 時回 null（不顯示）。
 */
export function formatLlmUsageFxNote(fx: LlmUsageFx | null): {
  rate: string
  date: string | null
  source: string | null
} | null {
  if (!fx || fx.rate === null || fx.rate === '') {
    return null
  }
  return {
    rate: fx.rate,
    date: fxDisplayDate(fx),
    source: fx.source
  }
}
