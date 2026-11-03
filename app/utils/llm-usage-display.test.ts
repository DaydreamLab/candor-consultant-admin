import { describe, expect, it } from 'vitest'
import type { LlmUsageSummaryPayload } from '~/utils/admin-api'
import {
  buildLlmUsageDetailRows,
  canShowLlmUsageTwd,
  displayTotalCostTwd,
  displayTotalCostUsd,
  formatLlmUsageCostPair,
  displayLlmUsageFxSource,
  formatLlmUsageFxNote,
  formatLlmUsageTokens,
  formatLlmUsageTwd,
  formatLlmUsageUsd,
  groupByCategoryModel,
  groupByPurposeModel,
  purposeLabelOf,
  totalTokensOf
} from '~/utils/llm-usage-display'

const CBC_FX_SOURCE = '中央銀行 新臺幣/美元 銀行間收盤匯率 (https://cpx.cbc.gov.tw/api/OpenData/FTDOpenData_Day)'

const base = {
  input_tokens: 46700,
  output_tokens: 5780,
  cache_read_tokens: 6400,
  cache_write_tokens: 0,
  estimated_cost_ntd: null,
  estimated_cost_usd: null,
  cost_twd: null,
  cost_complete: false,
  fx: null,
  by_model: [],
  by_category_model: [],
  decision_by_purpose_model: []
} satisfies LlmUsageSummaryPayload

const labels = {
  category: (c: string) => ({ chat: '聊天', report: '報告解析', decision: '決策', other: '其他' }[c] ?? c),
  model: (m: string) => m || '（未標示 model）',
  purpose: purposeLabelOf,
  total: '合計'
}

describe('llm-usage-display', () => {
  it('formats tokens with grouping separators', () => {
    expect(formatLlmUsageTokens(52480)).toBe('52,480')
  })

  it('formats usd and appends star when incomplete', () => {
    expect(formatLlmUsageUsd('0.1420', false)).toBe('US$0.142')
    expect(formatLlmUsageUsd('0.1420', true)).toBe('US$0.142*')
    expect(formatLlmUsageUsd(null, true)).toBeNull()
  })

  it('formats twd without converting', () => {
    expect(formatLlmUsageTwd('4.55')).toBe('NT$4.55')
    expect(formatLlmUsageTwd('4.50')).toBe('NT$4.5')
    expect(formatLlmUsageTwd(null)).toBeNull()
  })

  it('pairs usd+twd only when showTwd; incomplete star stays on usd', () => {
    expect(formatLlmUsageCostPair({
      usd: '0.1420',
      twd: '4.55',
      incomplete: true,
      showTwd: true
    })).toBe('US$0.142* NT$4.55')
    expect(formatLlmUsageCostPair({
      usd: '0.1420',
      twd: '4.55',
      incomplete: true,
      showTwd: false
    })).toBe('US$0.142*')
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
          cost_twd: '3.20',
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
          cost_twd: null,
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
          cost_twd: '0.16',
          cost_known: true
        }
      ]
    })).toEqual({ amount: '0.1050', incomplete: true })
  })

  it('uses top-level cost_twd or sums known detail cost_twd', () => {
    expect(displayTotalCostTwd({
      ...base,
      cost_twd: '4.55',
      cost_complete: false
    })).toBe('4.55')

    expect(displayTotalCostTwd({
      ...base,
      by_category_model: [
        {
          category: 'chat',
          model: 'claude-haiku-4-5',
          input_tokens: 1,
          output_tokens: 1,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.1000',
          cost_twd: '3.20',
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
          cost_twd: null,
          cost_known: false
        }
      ]
    })).toBe('3.20')
  })

  it('only shows twd when fx.rate is present', () => {
    expect(canShowLlmUsageTwd({ ...base, fx: null })).toBe(false)
    expect(canShowLlmUsageTwd({
      ...base,
      fx: {
        base: 'USD',
        quote: 'TWD',
        rate: null,
        rate_date: null,
        fetched_at: '2026-11-03T01:00:00Z',
        source: CBC_FX_SOURCE
      }
    })).toBe(false)
    expect(canShowLlmUsageTwd({
      ...base,
      fx: {
        base: 'USD',
        quote: 'TWD',
        rate: '32.15',
        rate_date: '2026-10-30',
        fetched_at: '2026-11-03T01:00:00Z',
        source: CBC_FX_SOURCE
      }
    })).toBe(true)
  })

  it('shortens long CBC fx.source to 中央銀行 with full title', () => {
    expect(displayLlmUsageFxSource(CBC_FX_SOURCE)).toEqual({
      label: '中央銀行',
      title: CBC_FX_SOURCE
    })
    expect(displayLlmUsageFxSource('短來源')).toEqual({
      label: '短來源',
      title: null
    })
    expect(displayLlmUsageFxSource(null)).toEqual({
      label: '—',
      title: null
    })
  })

  it('formats fx note with rate_date falling back to fetched_at', () => {
    expect(formatLlmUsageFxNote(null)).toBeNull()
    expect(formatLlmUsageFxNote({
      base: 'USD',
      quote: 'TWD',
      rate: null,
      rate_date: null,
      fetched_at: '2026-11-03T01:00:00Z',
      source: CBC_FX_SOURCE
    })).toBeNull()
    expect(formatLlmUsageFxNote({
      base: 'USD',
      quote: 'TWD',
      rate: '32.15',
      rate_date: '2026-10-30',
      fetched_at: '2026-11-03T01:00:00Z',
      source: CBC_FX_SOURCE
    })).toEqual({
      rate: '32.15',
      date: '2026-10-30',
      sourceLabel: '中央銀行',
      sourceTitle: CBC_FX_SOURCE
    })
    expect(formatLlmUsageFxNote({
      base: 'USD',
      quote: 'TWD',
      rate: '32.15',
      rate_date: null,
      fetched_at: '2026-11-03T01:00:00Z',
      source: CBC_FX_SOURCE
    })?.date).toBe('2026-11-03T01:00:00Z')
  })

  it('maps purpose labels with or without decision. prefix; unknown stays raw', () => {
    expect(purposeLabelOf('decision.cta.open_chat')).toBe('對話 CTA')
    expect(purposeLabelOf('cta.open_chat')).toBe('對話 CTA')
    expect(purposeLabelOf('reply_is_asking')).toBe('回覆是否在提問')
    expect(purposeLabelOf('decision.reply_is_asking')).toBe('回覆是否在提問')
    expect(purposeLabelOf('goal_utterance')).toBe('goals 判讀')
    expect(purposeLabelOf('decision.goal_utterance')).toBe('goals 判讀')
    expect(purposeLabelOf('decision.cta.triad_complete')).toBe('基本資料問完 CTA')
    expect(purposeLabelOf('decision.cta.questionnaire_gap')).toBe('補問缺漏題')
    expect(purposeLabelOf('decision.cta.lab_followup')).toBe('建議檢查／上傳 CTA')
    expect(purposeLabelOf('cta.lab_followup')).toBe('建議檢查／上傳 CTA')
    expect(purposeLabelOf('decision.cta.lab_report_prompt')).toBe('詢問血檢報告 CTA')
    expect(purposeLabelOf('cta.lab_report_prompt')).toBe('詢問血檢報告 CTA')
    expect(purposeLabelOf('decision.custom.unknown')).toBe('decision.custom.unknown')
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
        cost_twd: null,
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
        cost_twd: '0.96',
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
        cost_twd: '0.48',
        cost_known: true
      }
    ])
    expect(groups.map(g => g.category)).toEqual(['chat', 'report', 'decision'])
    expect(groups[2]!.cost_incomplete).toBe(true)
    expect(groups[0]!.input_tokens).toBe(20)
    expect(groups[0]!.cost_twd).toBe('0.96')
  })

  it('groups decision_by_purpose_model with incomplete star rule on purpose subtotal', () => {
    const groups = groupByPurposeModel([
      {
        purpose: 'decision.cta.open_chat',
        model: 'claude-haiku-4-5',
        input_tokens: 700,
        output_tokens: 30,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: '0.0050',
        cost_twd: '0.16',
        cost_known: true
      },
      {
        purpose: 'reply_is_asking',
        model: 'gpt-6-luna',
        input_tokens: 10900,
        output_tokens: 280,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: null,
        cost_twd: null,
        cost_known: false
      },
      {
        purpose: 'reply_is_asking',
        model: 'claude-haiku-4-5',
        input_tokens: 10,
        output_tokens: 2,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: '0.0010',
        cost_twd: '0.03',
        cost_known: true
      }
    ])
    expect(groups.map(g => g.purpose)).toEqual(['decision.cta.open_chat', 'reply_is_asking'])
    expect(groups[1]!.cost_incomplete).toBe(true)
    expect(groups[1]!.estimated_cost_usd).toBe('0.0010')
    expect(groups[1]!.cost_twd).toBe('0.03')
  })

  it('builds detail rows with purpose layer under decision when present', () => {
    const rows = buildLlmUsageDetailRows({
      ...base,
      estimated_cost_usd: '0.1420',
      cost_twd: '4.55',
      by_category_model: [
        {
          category: 'chat',
          model: 'claude-haiku-4-5',
          input_tokens: 31200,
          output_tokens: 4850,
          cache_read_tokens: 6400,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.1180',
          cost_twd: '3.78',
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
          cost_twd: null,
          cost_known: false
        },
        {
          category: 'decision',
          model: 'claude-haiku-4-5',
          input_tokens: 700,
          output_tokens: 30,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.0050',
          cost_twd: '0.16',
          cost_known: true
        }
      ],
      decision_by_purpose_model: [
        {
          purpose: 'decision.cta.open_chat',
          model: 'claude-haiku-4-5',
          input_tokens: 700,
          output_tokens: 30,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.0050',
          cost_twd: '0.16',
          cost_known: true
        },
        {
          purpose: 'reply_is_asking',
          model: 'gpt-6-luna',
          input_tokens: 10900,
          output_tokens: 280,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: null,
          cost_twd: null,
          cost_known: false
        }
      ]
    }, labels)

    expect(rows.filter(r => r.kind === 'group').map(r => r.label)).toEqual(['聊天', '決策'])
    const purposes = rows.filter(r => r.kind === 'purpose')
    expect(purposes.map(r => r.label)).toEqual(['對話 CTA', '回覆是否在提問'])
    expect(purposes[1]!.cost_incomplete).toBe(true)
    expect(purposes[1]!.estimated_cost_usd).toBeNull()
    expect(rows.some(r => r.kind === 'model' && r.label === 'gpt-6-luna' && r.purpose_key)).toBe(true)
    // decision category should NOT also flatten by_category_model models when purpose present
    expect(rows.filter(r => r.kind === 'model' && !r.purpose_key && r.label === 'gpt-6-luna')).toHaveLength(0)
  })

  it('reconciles d1b14565-shaped report payload: category sums equal headline totalTokens; report labeled 報告解析', () => {
    // extract 30+668、chat 2797+327、decision goal_utterance 1014+200 → 5,036
    const summary: LlmUsageSummaryPayload = {
      ...base,
      input_tokens: 3841,
      output_tokens: 1195,
      cache_read_tokens: 0,
      cache_write_tokens: 2965,
      estimated_cost_usd: '0.0500',
      cost_twd: '1.61',
      cost_complete: true,
      by_category_model: [
        {
          category: 'report',
          model: 'claude-haiku-4-5',
          input_tokens: 30,
          output_tokens: 668,
          cache_read_tokens: 0,
          cache_write_tokens: 2965,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.0200',
          cost_twd: '0.64',
          cost_known: true
        },
        {
          category: 'chat',
          model: 'claude-haiku-4-5',
          input_tokens: 2797,
          output_tokens: 327,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.0200',
          cost_twd: '0.64',
          cost_known: true
        },
        {
          category: 'decision',
          model: 'claude-haiku-4-5',
          input_tokens: 1014,
          output_tokens: 200,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.0100',
          cost_twd: '0.32',
          cost_known: true
        }
      ],
      decision_by_purpose_model: [
        {
          purpose: 'goal_utterance',
          model: 'claude-haiku-4-5',
          input_tokens: 1014,
          output_tokens: 200,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.0100',
          cost_twd: '0.32',
          cost_known: true
        }
      ]
    }

    expect(totalTokensOf(summary)).toBe(5036)

    const groups = groupByCategoryModel(summary.by_category_model)
    const categorySum = groups.reduce(
      (sum, g) => sum + g.input_tokens + g.output_tokens,
      0
    )
    expect(categorySum).toBe(totalTokensOf(summary))

    const rows = buildLlmUsageDetailRows(summary, labels)
    const reportGroup = rows.find(r => r.kind === 'group' && r.label === '報告解析')
    expect(reportGroup).toBeTruthy()
    expect(reportGroup!.input_tokens + reportGroup!.output_tokens).toBe(698)

    const totalRow = rows.find(r => r.kind === 'total')
    expect(totalRow).toBeTruthy()
    expect(totalRow!.input_tokens).toBe(summary.input_tokens)
    expect(totalRow!.output_tokens).toBe(summary.output_tokens)
    expect(totalRow!.input_tokens + totalRow!.output_tokens).toBe(5036)
  })

  it('falls back to flat decision models when decision_by_purpose_model is empty', () => {
    const rows = buildLlmUsageDetailRows({
      ...base,
      estimated_cost_usd: '0.1420',
      by_category_model: [
        {
          category: 'decision',
          model: 'gpt-6-luna',
          input_tokens: 10900,
          output_tokens: 280,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: null,
          cost_twd: null,
          cost_known: false
        },
        {
          category: 'decision',
          model: 'claude-haiku-4-5',
          input_tokens: 700,
          output_tokens: 30,
          cache_read_tokens: 0,
          cache_write_tokens: 0,
          estimated_cost_ntd: null,
          estimated_cost_usd: '0.0050',
          cost_twd: '0.16',
          cost_known: true
        }
      ]
    }, labels)

    expect(rows.filter(r => r.kind === 'purpose')).toHaveLength(0)
    expect(rows.filter(r => r.kind === 'model').map(r => r.label)).toEqual([
      'gpt-6-luna',
      'claude-haiku-4-5'
    ])
  })

  it('keeps unknown purpose label as raw value in detail rows', () => {
    const rows = buildLlmUsageDetailRows({
      ...base,
      estimated_cost_usd: '0.0100',
      cost_complete: true,
      by_category_model: [{
        category: 'decision',
        model: 'claude-haiku-4-5',
        input_tokens: 10,
        output_tokens: 1,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: '0.0100',
        cost_twd: '0.32',
        cost_known: true
      }],
      decision_by_purpose_model: [{
        purpose: 'decision.custom.brand_new',
        model: 'claude-haiku-4-5',
        input_tokens: 10,
        output_tokens: 1,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: null,
        estimated_cost_usd: '0.0100',
        cost_twd: '0.32',
        cost_known: true
      }]
    }, labels)
    expect(rows.find(r => r.kind === 'purpose')?.label).toBe('decision.custom.brand_new')
  })

  it('falls back to flat by_model rows when by_category_model is empty', () => {
    const rows = buildLlmUsageDetailRows({
      ...base,
      cost_complete: true,
      estimated_cost_ntd: '3.00',
      estimated_cost_usd: '0.1000',
      cost_twd: '3.20',
      by_model: [{
        model: 'claude-sonnet-4-5',
        input_tokens: 100,
        output_tokens: 40,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        estimated_cost_ntd: '3.00',
        estimated_cost_usd: '0.1000',
        cost_twd: '3.20',
        cost_known: true
      }]
    }, labels)
    expect(rows.filter(r => r.kind === 'group')).toHaveLength(0)
    expect(rows.filter(r => r.kind === 'model')).toHaveLength(1)
    expect(rows[0]!.label).toBe('claude-sonnet-4-5')
  })
})
