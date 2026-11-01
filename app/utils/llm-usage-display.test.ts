import { describe, expect, it } from 'vitest'
import type { LlmUsageSummaryPayload } from '~/utils/admin-api'
import {
  buildLlmUsageDetailRows,
  displayTotalCostUsd,
  formatLlmUsageTokens,
  formatLlmUsageUsd,
  groupByCategoryModel,
  totalTokensOf
} from '~/utils/llm-usage-display'

const base = {
  input_tokens: 46700,
  output_tokens: 5780,
  cache_read_tokens: 6400,
  cache_write_tokens: 0,
  estimated_cost_ntd: null,
  estimated_cost_usd: null,
  cost_complete: false,
  by_model: [],
  by_category_model: []
} satisfies LlmUsageSummaryPayload

describe('llm-usage-display', () => {
  it('formats tokens with grouping separators', () => {
    expect(formatLlmUsageTokens(52480)).toBe('52,480')
  })

  it('formats usd and appends star when incomplete', () => {
    expect(formatLlmUsageUsd('0.1420', false)).toBe('US$0.142')
    expect(formatLlmUsageUsd('0.1420', true)).toBe('US$0.142*')
    expect(formatLlmUsageUsd(null, true)).toBeNull()
  })

  it('sums input+output for headline total tokens', () => {
    expect(totalTokensOf(base)).toBe(52480)
  })

  it('uses top-level usd when present; otherwise sums known detail costs', () => {
    expect(displayTotalCostUsd({
      ...base,
      estimated_cost_usd: '0.1420',
      cost_complete: false
    })).toEqual({ amount: '0.1420', incomplete: true })

    expect(displayTotalCostUsd({
      ...base,
      by_category_model: [
        {
          category: 'chat',
          model: 'claude-haiku-4-5',
          input_tokens: 1,
          output_tokens: 1,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: '3.20',
          estimated_cost_usd: '0.1000',
          cost_known: true
        },
        {
          category: 'decision',
          model: 'gpt-6-luna',
          input_tokens: 1,
          output_tokens: 1,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: null,
          cost_known: false
        },
        {
          category: 'decision',
          model: 'claude-haiku-4-5',
          input_tokens: 1,
          output_tokens: 1,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: '0.16',
          estimated_cost_usd: '0.0050',
          cost_known: true
        }
      ]
    })).toEqual({ amount: '0.1050', incomplete: true })
  })

  it('groups by_category_model with decision kept separate and ordered', () => {
    const groups = groupByCategoryModel([
      {
        category: 'decision',
        model: 'gpt-6-luna',
        input_tokens: 10,
        output_tokens: 1,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: null,
        cost_known: false
      },
      {
        category: 'chat',
        model: 'claude-haiku-4-5',
        input_tokens: 20,
        output_tokens: 2,
        cache_read_tokens: 3,
        cache_write_tokens: 0,
        estimated_cost_ntd: '1.00',
        estimated_cost_usd: '0.0300',
        cost_known: true
      },
      {
        category: 'report',
        model: 'claude-haiku-4-5',
        input_tokens: 5,
        output_tokens: 1,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: '0.50',
        estimated_cost_usd: '0.0150',
        cost_known: true
      }
    ])
    expect(groups.map(g => g.category)).toEqual(['chat', 'report', 'decision'])
    expect(groups[2]!.cost_incomplete).toBe(true)
    expect(groups[0]!.input_tokens).toBe(20)
  })

  it('builds detail rows from by_category_model without mixing costs across categories', () => {
    const rows = buildLlmUsageDetailRows({
      ...base,
      estimated_cost_usd: '0.1420',
      by_category_model: [
        {
          category: 'chat',
          model: 'claude-haiku-4-5',
          input_tokens: 31200,
          output_tokens: 4850,
          cache_read_tokens: 6400,
          cache_write_tokens: 0,
          estimated_cost_ntd: '3.78',
          estimated_cost_usd: '0.1180',
          cost_known: true
        },
        {
          category: 'decision',
          model: 'gpt-6-luna',
          input_tokens: 10900,
          output_tokens: 280,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: null,
          cost_known: false
        },
        {
          category: 'decision',
          model: 'claude-haiku-4-5',
          input_tokens: 700,
          output_tokens: 30,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: '0.16',
          estimated_cost_usd: '0.0050',
          cost_known: true
        }
      ]
    }, {
      category: c => ({ chat: '聊天', decision: '決策' }[c] ?? c),
      model: m => m || '（未標示 model）',
      total: '合計'
    })

    expect(rows.filter(r => r.kind === 'group').map(r => r.label)).toEqual(['聊天', '決策'])
    const unknown = rows.find(r => r.label === 'gpt-6-luna')
    expect(unknown?.cost_unknown_label).toBe(true)
    const decisionGroup = rows.find(r => r.kind === 'group' && r.label === '決策')
    expect(decisionGroup?.estimated_cost_usd).toBe('0.0050')
    expect(decisionGroup?.cost_incomplete).toBe(true)
    expect(rows.at(-1)?.kind).toBe('total')
  })

  it('falls back to flat by_model rows when by_category_model is empty', () => {
    const rows = buildLlmUsageDetailRows({
      ...base,
      cost_complete: true,
      estimated_cost_ntd: '3.00',
      estimated_cost_usd: '0.1000',
      by_model: [{
        model: 'claude-sonnet-4-5',
        input_tokens: 100,
        output_tokens: 40,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: '3.00',
        estimated_cost_usd: '0.1000',
        cost_known: true
      }]
    }, {
      category: c => c,
      model: m => m,
      total: '合計'
    })
    expect(rows.filter(r => r.kind === 'group')).toHaveLength(0)
    expect(rows.filter(r => r.kind === 'model')).toHaveLength(1)
    expect(rows[0]!.label).toBe('claude-sonnet-4-5')
  })
})
