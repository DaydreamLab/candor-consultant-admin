import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatReplyActionsReadonly from './ChatReplyActionsReadonly.vue'

function translate(key: string, params?: Record<string, unknown>) {
  const fixed: Record<string, string> = {
    'chatCta.confirm': '確認',
    'chatCta.askReport': '上傳報告',
    'chatCta.offerCheckup': '我想做檢查，確認各項指標',
    'chatCta.offerRecommend': '查看推薦方案',
    'chatCta.offerFullTest': '了解完整 136 項檢測',
    'chatCta.offerExpertBooking': '預約專家諮詢',
    'chatCta.continueConsult': '繼續健康諮詢',
    'chatCta.unknown': '操作',
    'chatCta.vitalsAgeUnit': '歲',
    'chatCta.vitalsHeightUnit': 'cm',
    'chatCta.vitalsWeightUnit': 'kg'
  }
  if (key === 'chatCta.vitalsValue' && params) {
    return `${params.value} ${params.unit}`
  }
  return fixed[key] ?? key
}

beforeEach(() => {
  vi.stubGlobal('useI18n', () => ({ t: translate }))
})

function mountCta(replyActions: unknown) {
  return mount(ChatReplyActionsReadonly, {
    props: { replyActions },
    global: {
      mocks: { $t: translate }
    }
  })
}

describe('ChatReplyActionsReadonly', () => {
  it('renders selected and grey chips with full-width confirm', () => {
    const wrapper = mountCta({
      interaction: { round_status: 'historical', outcome: 'option_selected' },
      actions: [{
        type: 'choose_option',
        payload: {
          confirm: true,
          confirm_status: 'selected',
          options: [
            { code: 'chat', label: '我想聊聊', status: 'disabled' },
            { code: 'plan', label: '我想諮詢健康方案', status: 'selected' },
            { code: 'report', label: '幫我看報告', status: 'disabled' }
          ]
        }
      }]
    })

    expect(wrapper.find('[data-testid="chat-cta-chip-plan"]').classes()).toContain('is-on')
    expect(wrapper.find('[data-testid="chat-cta-chip-chat"]').classes()).toContain('is-off')
    expect(wrapper.find('[data-testid="chat-cta-confirm"]').classes()).toContain('is-on')
    expect(wrapper.find('[data-testid="chat-cta-confirm"]').text()).toBe('確認')
  })

  it('renders grey vitals with stored value and empty grey when unstored', async () => {
    const stored = mountCta({
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['age'],
          status: 'disabled',
          has_stored_value: true,
          stored_value: 36
        }
      }]
    })
    const vitals = stored.find('[data-testid="chat-cta-vitals"]')
    expect(vitals.classes()).toContain('is-off')
    expect(vitals.attributes('data-has-stored-value')).toBe('1')
    expect(vitals.text()).toBe('36 歲')

    const empty = mountCta({
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['age'],
          status: 'disabled',
          has_stored_value: false,
          stored_value: null
        }
      }]
    })
    const emptyCard = empty.find('[data-testid="chat-cta-vitals"]')
    expect(emptyCard.classes()).toContain('is-empty')
    expect(emptyCard.attributes('data-has-stored-value')).toBe('0')
    expect(emptyCard.text()).toBe('')
  })

  it('renders nothing when reply_actions missing or empty', () => {
    expect(mountCta(null).find('[data-testid="chat-reply-actions-readonly"]').exists()).toBe(false)
    expect(mountCta({ actions: [] }).find('[data-testid="chat-reply-actions-readonly"]').exists()).toBe(false)
  })

  it('does not expose interactive controls', () => {
    const wrapper = mountCta({
      actions: [{
        type: 'choose_option',
        payload: {
          options: [{ code: 'a', label: 'A', status: 'current' }]
        }
      }]
    })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('renders human labels for ask_report / offer_checkup without payload label', () => {
    const wrapper = mountCta({
      interaction: { round_status: 'historical', outcome: null },
      actions: [
        { type: 'ask_report', payload: { status: 'disabled' } },
        { type: 'offer_checkup', payload: { status: 'disabled', url: 'https://example.com/checkup' } }
      ]
    })
    const ask = wrapper.find('[data-testid="chat-cta-whole-ask_report"]')
    const checkup = wrapper.find('[data-testid="chat-cta-whole-offer_checkup"]')
    expect(ask.exists()).toBe(true)
    expect(checkup.exists()).toBe(true)
    expect(ask.text()).toBe('上傳報告')
    expect(checkup.text()).toBe('我想做檢查，確認各項指標')
    expect(ask.text()).not.toBe('ask_report')
    expect(checkup.text()).not.toBe('offer_checkup')
  })

  it('prefers payload label for whole actions and uses neutral for unknown', () => {
    const wrapper = mountCta({
      actions: [
        { type: 'offer_full_test', payload: { status: 'disabled', label: '客製完整檢測' } },
        { type: 'weird_future_cta', payload: { status: 'disabled' } }
      ]
    })
    expect(wrapper.find('[data-testid="chat-cta-whole-offer_full_test"]').text()).toBe('客製完整檢測')
    expect(wrapper.find('[data-testid="chat-cta-whole-weird_future_cta"]').text()).toBe('操作')
  })
})
