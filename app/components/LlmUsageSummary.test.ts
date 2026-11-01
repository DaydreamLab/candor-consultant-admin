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
  'llmUsage.incompleteNote': '* 含單價未設定的模型，成本未計入該部分。',
  'llmUsage.unknownModel': '（未標示 model）',
  'llmUsage.categories.chat': '聊天',
  'llmUsage.categories.report': '報告',
  'llmUsage.categories.decision': '決策',
  'llmUsage.categories.other': '其他'
}

function translate(key: string) {
  return labels[key] ?? key
}

const fixtureNew = {
  input_tokens: 46700,
  output_tokens: 5780,
  cache_read_tokens: 6400,
  cache_write_tokens: 0,
  estimated_cost_ntd: null,
  estimated_cost_usd: '0.1420',
  cost_complete: false,
  by_model: [
    {
      model: 'claude-haiku-4-5',
      input_tokens: 35800,
      output_tokens: 5500,
      cache_read_tokens: 6400,
      cache_write_tokens: 0,
      estimated_cost_ntd: '4.42',
      estimated_cost_usd: '0.1370',
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

  it('shows headline totals only by default', () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: fixtureNew }
    })

    expect(wrapper.text()).toContain('Token 用量')
    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('52,480')
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).toBe('US$0.142*')
    expect(wrapper.find('[data-testid="llm-usage-details"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="llm-usage-detail-group"]')).toHaveLength(0)
  })

  it('opens category×model details with unknown cost and incomplete note', async () => {
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

    const models = wrapper.findAll('[data-testid="llm-usage-detail-model"]')
    expect(models.some(m => m.text().includes('gpt-6-luna') && m.text().includes('未知'))).toBe(true)
    expect(models.some(m => m.text().includes('claude-haiku-4-5') && m.text().includes('US$0.118'))).toBe(true)
    expect(wrapper.find('[data-testid="llm-usage-incomplete-note"]').text()).toContain('* 含單價未設定')
    expect(wrapper.find('[data-testid="llm-usage-detail-total"]').text()).toContain('合計')
    expect(wrapper.find('[data-testid="llm-usage-detail-total"]').text()).toContain('US$0.142*')
  })

  it('falls back to by_model details when by_category_model is absent', async () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: fixtureLegacy }
    })

    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('140')
    expect(wrapper.find('[data-testid="llm-usage-total-cost"]').text()).toBe('US$0.1')
    await wrapper.find('[data-testid="llm-usage-info"]').trigger('click')
    expect(wrapper.findAll('[data-testid="llm-usage-detail-group"]')).toHaveLength(0)
    const models = wrapper.findAll('[data-testid="llm-usage-detail-model"]')
    expect(models).toHaveLength(2)
    expect(models[0]!.text()).toContain('claude-sonnet-4-5')
    expect(models[1]!.text()).toContain('claude-haiku')
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
