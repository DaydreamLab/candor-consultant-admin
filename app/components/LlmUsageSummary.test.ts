import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LlmUsageSummary from './LlmUsageSummary.vue'

const labels: Record<string, string> = {
  'llmUsage.input': '輸入',
  'llmUsage.output': '輸出',
  'llmUsage.cost': '預估成本',
  'llmUsage.tokens': '{n} tokens',
  'llmUsage.ntd': 'NT${amount}',
  'llmUsage.usd': '${amount}',
  'llmUsage.total': '總計',
  'llmUsage.unknownModel': '（未標示 model）'
}

function translate(key: string, params?: Record<string, unknown>) {
  const template = labels[key] ?? key
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
}

describe('LlmUsageSummary', () => {
  beforeEach(() => {
    vi.stubGlobal('useI18n', () => ({ t: translate }))
  })

  it('shows totals only when by_model is missing', () => {
    const wrapper = mount(LlmUsageSummary, {
      props: {
        usage: {
          input_tokens: 12,
          output_tokens: 3,
          estimated_cost_ntd: '0.50',
          estimated_cost_usd: '0.0160'
        }
      }
    })

    expect(wrapper.findAll('[data-testid="llm-usage-by-model"]')).toHaveLength(0)
    const total = wrapper.find('[data-testid="llm-usage-total"]')
    expect(total.text()).toContain('輸入:')
    expect(total.text()).toContain('12 tokens')
    expect(total.text()).toContain('3 tokens')
    expect(total.text()).toContain('NT$0.50')
    expect(total.text()).not.toContain('總計')
  })

  it('renders each model row plus a total label when by_model is present', () => {
    const wrapper = mount(LlmUsageSummary, {
      props: {
        usage: {
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
      }
    })

    const rows = wrapper.findAll('[data-testid="llm-usage-by-model"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('claude-sonnet-4-5')
    expect(rows[0]!.text()).toContain('70 tokens')
    expect(rows[1]!.text()).toContain('claude-haiku')
    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('總計')
    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('100 tokens')
  })

  it('degrades to zeros when usage is null', () => {
    const wrapper = mount(LlmUsageSummary, {
      props: { usage: null }
    })

    expect(wrapper.findAll('[data-testid="llm-usage-by-model"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('0 tokens')
    expect(wrapper.find('[data-testid="llm-usage-total"]').text()).toContain('NT$0.00')
  })

  it('uses unknown-model label for blank model names', () => {
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

    expect(wrapper.find('[data-testid="llm-usage-by-model"]').text()).toContain('（未標示 model）')
  })
})
