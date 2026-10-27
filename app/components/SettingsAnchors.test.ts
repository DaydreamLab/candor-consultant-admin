import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SettingsAnchors from './SettingsAnchors.vue'
import type { SettingsAnchorId } from '~/utils/settings-anchors'

const labels: Record<string, string> = {
  'settings.anchors.navLabel': '設定分區',
  'settings.anchors.payment': '支付',
  'settings.anchors.invoice': '發票',
  'settings.anchors.biomarker': '報告判讀',
  'settings.anchors.privacy': '隱私權政策',
  'settings.anchors.ctaCatalog': 'CTA 目錄',
  'settings.anchors.other': '其他'
}

function translate(key: string) {
  return labels[key] ?? key
}

describe('SettingsAnchors', () => {
  it('renders CTA after privacy and emits selection', async () => {
    const items: SettingsAnchorId[] = [
      'payment',
      'invoice',
      'biomarker',
      'privacy',
      'cta-catalog',
      'other'
    ]
    const wrapper = mount(SettingsAnchors, {
      props: {
        items,
        modelValue: 'privacy'
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
      '隱私權政策',
      'CTA 目錄',
      '其他'
    ])
    expect(wrapper.find('[data-testid="settings-anchor-cta-catalog"]').attributes('aria-current')).toBeUndefined()

    await wrapper.find('[data-testid="settings-anchor-cta-catalog"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['cta-catalog'])
  })
})
