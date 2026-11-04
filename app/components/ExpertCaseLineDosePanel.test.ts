import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExpertCaseLineDosePanel from './ExpertCaseLineDosePanel.vue'

const messages: Record<string, string> = {
  'custom.dose': '劑量',
  'custom.doseUnit': '顆',
  'custom.doseRemovedHint': '已標記移除；定稿後不會進入會員方案。',
  'custom.doseSuggestedReadonly': '劑量（建議）：{n} 顆',
  'custom.doseKeepEditHint': '須切換「調劑量」才可編輯。'
}

function mountPanel(decision: string) {
  return mount(ExpertCaseLineDosePanel, {
    props: {
      decision,
      awaiting: true,
      modelValue: '2',
      suggestedCount: '1',
      testIdPrefix: 'expert-case'
    },
    global: {
      mocks: {
        $t: (key: string, params?: { n?: string }) => {
          const template = messages[key] || key
          if (params?.n != null) {
            return template.replace('{n}', params.n)
          }
          return template
        }
      }
    }
  })
}

describe('ExpertCaseLineDosePanel', () => {
  it('shows editable CapsuleDoseStepper when decision is 調劑量／adjust', () => {
    const wrapper = mountPanel('adjust')
    expect(wrapper.find('[data-testid="expert-case-inline-dose-row"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-inline-dose"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-inline-dose-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-dose-readonly"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-case-dose-removed-hint"]').exists()).toBe(false)
  })

  it('keeps suggested dose readonly when decision is 保留／approve (no editable stepper)', () => {
    const wrapper = mountPanel('approve')
    expect(wrapper.find('[data-testid="expert-case-inline-dose-row"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-case-inline-dose"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-case-dose-readonly"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('劑量（建議）：1 顆')
  })

  it('hides dose controls when decision is 移除／reject', () => {
    const wrapper = mountPanel('reject')
    expect(wrapper.find('[data-testid="expert-case-inline-dose-row"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-case-dose-readonly"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-case-dose-removed-hint"]').exists()).toBe(true)
  })

  it('expands stepper for alias tokens (調劑量／adjust_dose)', () => {
    expect(mountPanel('調劑量').find('[data-testid="expert-case-inline-dose"]').exists()).toBe(true)
    expect(mountPanel('adjust_dose').find('[data-testid="expert-case-inline-dose"]').exists()).toBe(true)
  })
})
