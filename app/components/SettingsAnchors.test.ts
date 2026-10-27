import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsAnchors from './SettingsAnchors.vue'
import type { SettingsAnchorId } from '~/utils/settings-anchors'

const labels: Record<string, string> = {
  'settings.anchors.navLabel': '設定分區',
  'settings.anchors.payment': '支付',
  'settings.anchors.invoice': '發票',
  'settings.anchors.biomarker': '報告判讀',
  'settings.anchors.other': '其他'
}

function translate(key: string) {
  return labels[key] ?? key
}

describe('SettingsAnchors', () => {
  it('renders hub anchors without privacy/CTA and emits selection', async () => {
    const items: SettingsAnchorId[] = [
      'payment',
      'invoice',
      'biomarker',
      'other'
    ]
    const wrapper = mount(SettingsAnchors, {
      props: {
        items,
        modelValue: 'payment'
      },
      global: {
        mocks: { $t: translate }
      }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.map(b => b.text())).toEqual([
      '支付',
      '發票',
      '報告判讀',
      '其他'
    ])
    expect(wrapper.find('[data-testid="settings-anchor-privacy"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-anchor-cta-catalog"]').exists()).toBe(false)

    await wrapper.find('[data-testid="settings-anchor-invoice"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['invoice'])
  })
})
