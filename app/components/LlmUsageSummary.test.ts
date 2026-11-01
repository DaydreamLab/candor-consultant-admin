import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LlmUsageSummary from './LlmUsageSummary.vue'

const labels: Record<string, string> = {
  'llmUsage.title': 'Token 用量',
  'llmUsage.totalTokens': '總 tokens（input＋output）',
  'llmUsage.estimatedCost': '估算成本',
  'llmUsage.detailsToggle': '顯示用量明細',
  'llmUsage.colCategoryModel': '類別／模型',
  'llmUsage.colInput': 'input',
  'llmUsage.colOutput': 'output',
  'llmUsage.colCacheRead': 'cache 讀',
  'llmUsage.colCacheWrite': 'cache 寫',
  'llmUsage.colCost': '成本',
  'llmUsage.tableTotal': '合計',
  'llmUsage.costUnknown': '未知',
  'llmUsage.incompleteNote': '* 含單價未設定的模型，成本未計入該部分。決策依用途細分可再收合一層。',
  'llmUsage.fxNote': '匯率 {rate}｜匯率日期 {date}｜來源 {source}',
  'llmUsage.unknownModel': '（未標示 model）',
  'llmUsage.categories.chat': '聊天',
  'llmUsage.categories.report': '報告',
  'llmUsage.categories.decision': '決策',
  'llmUsage.categories.other': '其他'
}

function translate(key: string, params?: Record<string, string>) {
  const template = labels[key] ?? key
  if (!params) {
    return template
  }
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, value),
    template
  )
}

const CBC_FX_SOURCE = '中央銀行 新臺幣/美元 銀行間收盤匯率 (https://cpx.cbc.gov.tw/api/OpenData/FTDOpenData_Day)'

const fxOk = {
  base: 'USD',
  quote: 'TWD',
  rate: '32.15',
  rate_date: '2026-10-30',
  fetched_at: '2026-11-03T01:00:00Z',
  source: CBC_FX_SOURCE
}

const fixtureNew = {
  input_tokens: 46700,
  output_tokens: 5780,
  cache_read_tokens: 6400,
  cache_write_tokens: 0,
  estimated_cost_ntd: null,
  estimated_cost_usd: '0.1420',
  cost_twd: '4.55',
  cost_complete: false,
  fx: fxOk,
  by_model: [
    {
      model: 'claude-haiku-4-5',
      input_tokens: 35800,
      output_tokens: 5500,
      cache_read_tokens: 6400,
      cache_write_tokens: 0,
      estimated_cost_ntd: '4.42',
      estimated_cost_usd: '0.1370',
      cost_twd: '4.40',
      cost_known: true
    },
    {
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
  ],
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
      cost_twd: '3.78',
      cost_known: true
    },
    {
      category: 'report',
      model: 'claude-haiku-4-5',
      input_tokens: 3900,
      output_tokens: 620,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_ntd: '0.61',
      estimated_cost_usd: '0.0190',
      cost_twd: '0.61',
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
      estimated_cost_ntd: '0.16',
      estimated_cost_usd: '0.0050',
      cost_twd: '0.16',
      cost_known: true
    }
  ],
  decision_by_purpose_model: [
    {
      purpose: 'decision.cta.open_chat',
      model: 'claude-haiku-4-5',
      input_tokens: 400,
      output_tokens: 20,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_usd: '0.0030',
      cost_twd: '0.10',
      cost_known: true
    },
    {
      purpose: 'reply_is_asking',
      model: 'gpt-6-luna',
      input_tokens: 10900,
      output_tokens: 280,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_usd: null,
      cost_twd: null,
      cost_known: false
    },
    {
      purpose: 'goal_utterance',
      model: 'claude-haiku-4-5',
      input_tokens: 300,
      output_tokens: 10,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      estimated_cost_usd: '0.0020',
      cost_twd: '0.06',
      cost_known: true
    }
  ]
}

const fixtureLegacy = {
  input_tokens: 100,
  output_tokens: 40,
  estimated_cost_ntd: '3.00',
  estimated_cost_usd: '0.1000',
  by_model: [
    {
      model: 'claude-sonnet-4-5',
      input_tokens: 70,
      output_tokens: 30,
      estimated_cost_ntd: '2.00',
      estimated_cost_usd: '0.0700'
    },
    {
      model: 'claude-haiku',
      input_tokens: 30,
      output_tokens: 10,
      estimated_cost_ntd: '1.00',
      estimated_cost_usd: '0.0300'
    }
  ]
}

describe('LlmUsageSummary', () => {
  beforeEach(() => {
    vi.stubGlobal('useI18n', () => ({ t: translate }))
  })

  it('shows headline totals only by default, with * when cost incomplete', () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: fixtureNew }
    })

    expect(wrapper.text()).toContain('Token 用量')
    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('52,480')
    // 收合狀態：未知單價 → 總成本加 *
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).toBe('US$0.142* NT$4.55')
    expect(wrapper.find('[data-testid="llm-usage-details"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="llm-usage-detail-group"]')).toHaveLength(0)
  })

  it('shows only USD on collapsed total when fx.rate is null', () => {
    const wrapper = mount(LlmUsageSummary, {
      props: {
        usage: {
          ...fixtureNew,
          cost_twd: null,
          fx: {
            base: 'USD',
            quote: 'TWD',
            rate: null,
            rate_date: null,
            fetched_at: '2026-11-03T01:00:00Z',
            source: CBC_FX_SOURCE
          }
        }
      }
    })
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).toBe('US$0.142*')
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).not.toContain('NT$')
  })

  it('shows only USD when fx field is absent', () => {
    const { fx: _fx, ...withoutFx } = fixtureNew
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: withoutFx }
    })
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).toBe('US$0.142*')
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).not.toContain('NT$')
  })

  it('opens category×model details with purpose layer, unknown cost, fx note', async () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: fixtureNew },
      attachTo: document.body
    })

    await wrapper.find('[data-testid="llm-usage-info"]').trigger('click')
    const details = wrapper.find('[data-testid="llm-usage-details"]')
    expect(details.isVisible()).toBe(true)

    const groups = wrapper.findAll('[data-testid="llm-usage-detail-group"]')
    expect(groups.map(g => g.text())).toEqual(
      expect.arrayContaining([
        expect.stringContaining('聊天'),
        expect.stringContaining('報告'),
        expect.stringContaining('決策')
      ])
    )
    expect(groups).toHaveLength(3)

    const purposes = wrapper.findAll('[data-testid="llm-usage-detail-purpose"]')
    expect(purposes.map(p => p.text())).toEqual(
      expect.arrayContaining([
        expect.stringContaining('對話 CTA'),
        expect.stringContaining('回覆是否在提問'),
        expect.stringContaining('goals 判讀')
      ])
    )
    expect(purposes.some(p => p.text().includes('回覆是否在提問') && p.text().includes('US$'))).toBe(false)
    // 用途小計含未知 → 加 *
    const asking = purposes.find(p => p.text().includes('回覆是否在提問'))
    expect(asking?.text()).toContain('*')

    const models = wrapper.findAll('[data-testid="llm-usage-detail-model"]')
    expect(models.some(m => m.text().includes('gpt-6-luna') && m.text().includes('未知'))).toBe(true)
    expect(models.some(m => m.text().includes('claude-haiku-4-5') && m.text().includes('US$0.118') && m.text().includes('NT$3.78'))).toBe(true)

    expect(wrapper.find('[data-testid="llm-usage-incomplete-note"]').text()).toContain('* 含單價未設定')
    expect(wrapper.find('[data-testid="llm-usage-fx-note"]').text()).toContain('匯率 32.15')
    expect(wrapper.find('[data-testid="llm-usage-fx-note"]').text()).toContain('匯率日期 2026-10-30')
    expect(wrapper.find('[data-testid="llm-usage-fx-note"]').text()).toContain('來源 中央銀行')
    expect(wrapper.find('[data-testid="llm-usage-fx-note"]').text()).not.toContain('https://')
    expect(wrapper.find('[data-testid="llm-usage-fx-note"]').attributes('title')).toBe(CBC_FX_SOURCE)
    expect(wrapper.find('[data-testid="llm-usage-detail-total"]').text()).toContain('合計')
    expect(wrapper.find('[data-testid="llm-usage-detail-total"]').text()).toContain('US$0.142*')
    expect(wrapper.find('[data-testid="llm-usage-detail-total"]').text()).toContain('NT$4.55')
  })

  it('collapses purpose rows on toggle', async () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: fixtureNew, defaultDetailsOpen: true },
      attachTo: document.body
    })

    const before = wrapper.findAll('[data-testid="llm-usage-detail-model"]').length
    expect(before).toBeGreaterThan(0)

    const toggles = wrapper.findAll('[data-testid="llm-usage-purpose-toggle"]')
    expect(toggles.length).toBeGreaterThan(0)
    await toggles[0]!.trigger('click')

    const after = wrapper.findAll('[data-testid="llm-usage-detail-model"]').length
    expect(after).toBeLessThan(before)
  })

  it('shows unknown purpose as raw value', async () => {
    const wrapper = mount(LlmUsageSummary, {
      props: {
        usage: {
          input_tokens: 10,
          output_tokens: 1,
          estimated_cost_usd: '0.0100',
          cost_twd: '0.32',
          cost_complete: true,
          fx: fxOk,
          by_category_model: [{
            category: 'decision',
            model: 'claude-haiku-4-5',
            input_tokens: 10,
            output_tokens: 1,
            estimated_cost_usd: '0.0100',
            cost_twd: '0.32',
            cost_known: true
          }],
          decision_by_purpose_model: [{
            purpose: 'decision.custom.brand_new',
            model: 'claude-haiku-4-5',
            input_tokens: 10,
            output_tokens: 1,
            estimated_cost_usd: '0.0100',
            cost_twd: '0.32',
            cost_known: true
          }]
        },
        defaultDetailsOpen: true
      }
    })
    expect(wrapper.find('[data-testid="llm-usage-detail-purpose"]').text()).toContain('decision.custom.brand_new')
  })

  it('falls back to by_model details when by_category_model is absent', async () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: fixtureLegacy }
    })

    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('140')
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).toBe('US$0.1')
    await wrapper.find('[data-testid="llm-usage-info"]').trigger('click')
    expect(wrapper.findAll('[data-testid="llm-usage-detail-group"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="llm-usage-detail-purpose"]')).toHaveLength(0)
    const models = wrapper.findAll('[data-testid="llm-usage-detail-model"]')
    expect(models).toHaveLength(2)
    expect(models[0]!.text()).toContain('claude-sonnet-4-5')
    expect(models[1]!.text()).toContain('claude-haiku')
    expect(wrapper.find('[data-testid="llm-usage-fx-note"]').exists()).toBe(false)
  })

  it('falls back to flat decision models when decision_by_purpose_model is absent', async () => {
    const { decision_by_purpose_model: _p, ...withoutPurpose } = fixtureNew
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: withoutPurpose, defaultDetailsOpen: true }
    })
    expect(wrapper.findAll('[data-testid="llm-usage-detail-purpose"]')).toHaveLength(0)
    const models = wrapper.findAll('[data-testid="llm-usage-detail-model"]')
    expect(models.some(m => m.text().includes('gpt-6-luna'))).toBe(true)
  })

  it('hides fx note and NTD in details when rate is null', async () => {
    const wrapper = mount(LlmUsageSummary, {
      props: {
        usage: {
          ...fixtureNew,
          cost_twd: null,
          fx: {
            base: 'USD',
            quote: 'TWD',
            rate: null,
            rate_date: null,
            fetched_at: '2026-11-03T01:00:00Z',
            source: CBC_FX_SOURCE
          }
        },
        defaultDetailsOpen: true
      }
    })
    expect(wrapper.find('[data-testid="llm-usage-fx-note"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="llm-usage-detail-total"]').text()).toContain('US$0.142*')
    expect(wrapper.find('[data-testid="llm-usage-detail-total"]').text()).not.toContain('NT$')
  })

  it('degrades to zeros when usage is null and hides info icon', () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: null }
    })

    expect(wrapper.find('[data-testid="llm-usage-info"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('0')
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).toContain('US$0')
  })

  it('uses unknown-model label for blank model names in legacy rows', async () => {
    const wrapper = mount(LlmUsageSummary, {
      props: {
        usage: {
          input_tokens: 1,
          output_tokens: 0,
          estimated_cost_ntd: '0.01',
          estimated_cost_usd: '0.0003',
          by_model: [{
            model: '  ',
            input_tokens: 1,
            output_tokens: 0,
            estimated_cost_ntd: '0.01',
            estimated_cost_usd: '0.0003'
          }]
        }
      }
    })

    await wrapper.find('[data-testid="llm-usage-info"]').trigger('click')
    expect(wrapper.find('[data-testid="llm-usage-detail-model"]').text()).toContain('（未標示 model）')
  })
})
