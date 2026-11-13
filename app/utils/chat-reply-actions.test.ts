import { describe, expect, it } from 'vitest'
import {
  asCtaControlStatus,
  ctaStatusClass,
  extractReplyActions,
  parseReplyActionsView,
  payloadWholeLabel,
  resolveWholeActionLabel,
  vitalsDisplayField,
  wholeActionLabelKey,
  WHOLE_ACTION_LABEL_KEYS
} from './chat-reply-actions'

const LABELS: Record<string, string> = {
  'chatCta.askReport': '上傳報告',
  'chatCta.offerCheckup': '我想做檢查，確認各項指標',
  'chatCta.offerRecommend': '查看推薦方案',
  'chatCta.offerFullTest': '了解完整 136 項檢測',
  'chatCta.offerExpertBooking': '預約專家諮詢',
  'chatCta.continueConsult': '繼續健康諮詢',
  'chatCta.unknown': '操作'
}

function t(key: string) {
  return LABELS[key] ?? key
}

describe('chat-reply-actions', () => {
  it('extracts reply_actions from row or meta', () => {
    expect(extractReplyActions({ reply_actions: { actions: [] } })).toEqual({ actions: [] })
    expect(extractReplyActions({ meta: { reply_actions: { a: 1 } } })).toEqual({ a: 1 })
    expect(extractReplyActions({ content: 'hi' })).toBeNull()
    expect(extractReplyActions(null)).toBeNull()
  })

  it('parses selected choose_option with confirm', () => {
    const view = parseReplyActionsView({
      schema_version: '0.1',
      interaction: { round_status: 'historical', outcome: 'option_selected' },
      actions: [{
        type: 'choose_option',
        payload: {
          confirm: true,
          confirm_status: 'selected',
          options: [
            { code: 'sleep', label: '睡眠', status: 'selected' },
            { code: 'gi', label: '腸胃道', status: 'disabled' }
          ]
        }
      }]
    })
    expect(view).not.toBeNull()
    expect(view!.interaction?.outcome).toBe('option_selected')
    const action = view!.actions[0]!
    expect(action.type).toBe('choose_option')
    if (action.type !== 'choose_option' && action.type !== 'ask_goal') {
      return
    }
    expect(action.payload.options[0]?.status).toBe('selected')
    expect(action.payload.options[1]?.status).toBe('disabled')
    expect(action.payload.confirm_status).toBe('selected')
  })

  it('parses free_text vitals with and without stored value', () => {
    const stored = parseReplyActionsView({
      interaction: { round_status: 'historical', outcome: 'free_text' },
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['age'],
          gap_code: 'age',
          status: 'disabled',
          has_stored_value: true,
          stored_value: 36
        }
      }]
    })
    const unstored = parseReplyActionsView({
      interaction: { round_status: 'historical', outcome: 'free_text' },
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
    expect(stored!.actions[0]).toMatchObject({
      type: 'ask_vitals',
      payload: { has_stored_value: true, stored_value: 36, status: 'disabled' }
    })
    expect(unstored!.actions[0]).toMatchObject({
      type: 'ask_vitals',
      payload: { has_stored_value: false, stored_value: null }
    })
    if (stored!.actions[0]?.type === 'ask_vitals') {
      expect(vitalsDisplayField(stored!.actions[0].payload)).toBe('age')
    }
  })

  it('treats missing status as disabled (legacy-safe)', () => {
    const view = parseReplyActionsView({
      actions: [{
        type: 'choose_option',
        payload: {
          options: [
            { code: 'A', label: '甲' },
            { code: 'B', label: '乙' }
          ]
        }
      }]
    })
    expect(view).not.toBeNull()
    if (view!.actions[0]?.type !== 'choose_option') {
      throw new Error('expected choose_option')
    }
    expect(view!.actions[0].payload.options.every(o => o.status === 'disabled')).toBe(true)
    expect(asCtaControlStatus(undefined)).toBe('disabled')
    expect(ctaStatusClass('selected')).toBe('is-on')
    expect(ctaStatusClass('disabled')).toBe('is-off')
    expect(ctaStatusClass('current')).toBe('is-current')
  })

  it('returns null for empty or unknown envelopes', () => {
    expect(parseReplyActionsView(null)).toBeNull()
    expect(parseReplyActionsView({ actions: [] })).toBeNull()
    expect(parseReplyActionsView({ actions: [{ type: 'none', payload: {} }] })).toBeNull()
  })

  it('parses ask_goal like choose_option and whole actions', () => {
    const view = parseReplyActionsView({
      actions: [
        {
          type: 'ask_goal',
          payload: {
            mode: 'multi',
            confirm: true,
            confirm_status: 'disabled',
            options: [{ code: 'sleep', label: '睡眠', status: 'disabled' }]
          }
        },
        {
          type: 'offer_recommend',
          payload: { status: 'selected', label: '查看推薦方案' }
        }
      ]
    })
    expect(view!.actions).toHaveLength(2)
    expect(view!.actions[0]?.type).toBe('ask_goal')
    expect(view!.actions[1]).toMatchObject({
      type: 'whole',
      actionType: 'offer_recommend',
      payload: { status: 'selected', label: '查看推薦方案' }
    })
  })

  it('maps whole action types to younger-aligned i18n keys', () => {
    expect(WHOLE_ACTION_LABEL_KEYS.ask_report).toBe('chatCta.askReport')
    expect(WHOLE_ACTION_LABEL_KEYS.offer_checkup).toBe('chatCta.offerCheckup')
    expect(WHOLE_ACTION_LABEL_KEYS.offer_recommend).toBe('chatCta.offerRecommend')
    expect(WHOLE_ACTION_LABEL_KEYS.offer_full_test).toBe('chatCta.offerFullTest')
    expect(WHOLE_ACTION_LABEL_KEYS.offer_expert_booking).toBe('chatCta.offerExpertBooking')
    expect(WHOLE_ACTION_LABEL_KEYS.continue_chat).toBe('chatCta.continueConsult')
    expect(wholeActionLabelKey('ask_report')).toBe('chatCta.askReport')
    expect(wholeActionLabelKey('mystery_snake_case')).toBe('chatCta.unknown')
  })

  it('prefers payload label then type mapping; never raw snake_case', () => {
    expect(resolveWholeActionLabel('ask_report', null, t)).toBe('上傳報告')
    expect(resolveWholeActionLabel('offer_checkup', '', t)).toBe('我想做檢查，確認各項指標')
    expect(resolveWholeActionLabel('offer_recommend', null, t)).toBe('查看推薦方案')
    expect(resolveWholeActionLabel('offer_full_test', '客製完整檢測', t)).toBe('客製完整檢測')
    expect(resolveWholeActionLabel('offer_full_test', null, t)).toBe('了解完整 136 項檢測')
    expect(resolveWholeActionLabel('offer_expert_booking', '  ', t)).toBe('預約專家諮詢')
    expect(resolveWholeActionLabel('continue_chat', null, t)).toBe('繼續健康諮詢')
    expect(resolveWholeActionLabel('upload', null, t)).toBe('上傳報告')
    expect(resolveWholeActionLabel('go_checkup', null, t)).toBe('我想做檢查，確認各項指標')
    expect(resolveWholeActionLabel('totally_unknown_type', null, t)).toBe('操作')
    expect(resolveWholeActionLabel('totally_unknown_type', null, t)).not.toMatch(/_/)
  })

  it('stores empty whole label when payload omits copy (UI resolves via i18n)', () => {
    expect(payloadWholeLabel({})).toBe('')
    expect(payloadWholeLabel({ copy: 'hint only' })).toBe('')
    expect(payloadWholeLabel({ label: '  上傳報告  ' })).toBe('上傳報告')

    const view = parseReplyActionsView({
      actions: [
        { type: 'ask_report', payload: { status: 'disabled' } },
        { type: 'offer_checkup', payload: { status: 'disabled', url: 'https://example.com' } }
      ]
    })
    expect(view!.actions).toEqual([
      { type: 'whole', actionType: 'ask_report', payload: { status: 'disabled', label: '' } },
      { type: 'whole', actionType: 'offer_checkup', payload: { status: 'disabled', label: '' } }
    ])
    const ask = view!.actions[0]!
    const checkup = view!.actions[1]!
    expect(ask.type).toBe('whole')
    expect(checkup.type).toBe('whole')
    if (ask.type === 'whole') {
      expect(resolveWholeActionLabel(ask.actionType, ask.payload.label, t)).toBe('上傳報告')
    }
    if (checkup.type === 'whole') {
      expect(resolveWholeActionLabel(checkup.actionType, checkup.payload.label, t)).toBe('我想做檢查，確認各項指標')
    }
  })
})
