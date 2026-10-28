import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExpertCaseSellableItemPicker from './ExpertCaseSellableItemPicker.vue'
import type { SellablePickRow } from '~/utils/expert-case-sellable'

const items: SellablePickRow[] = [
  {
    id: 'on-1',
    name: '魚油',
    code: 'FO',
    sku: 'SKU-FO',
    sale_status: 'on_sale',
    daily_dose: 1,
    daily_servings_min: 1,
    daily_servings_max: 2,
    spec_text: '1000 mg'
  },
  {
    id: 'off-1',
    name: '停售鈣',
    code: 'CA',
    sku: 'SKU-CA',
    sale_status: 'off_sale',
    daily_dose: 1,
    daily_servings_min: 1,
    daily_servings_max: 2,
    spec_text: null
  },
  {
    id: 'on-2',
    name: '維生素 C',
    code: 'VC',
    sku: 'SKU-VC',
    sale_status: 'on_sale',
    daily_dose: 1,
    daily_servings_min: 0.5,
    daily_servings_max: 3,
    spec_text: null
  }
]

const uInputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', ($event.target).value)" />'
}

describe('ExpertCaseSellableItemPicker', () => {
  it('lists only on_sale items and emits selection', async () => {
    const wrapper = mount(ExpertCaseSellableItemPicker, {
      props: {
        items,
        modelValue: null
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          UInput: uInputStub
        }
      }
    })

    await flushPromises()
    expect(wrapper.find('[data-testid="expert-case-sellable-picker-option-on-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-sellable-picker-option-on-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-sellable-picker-option-off-1"]').exists()).toBe(false)

    await wrapper.find('[data-testid="expert-case-sellable-picker-option-on-2"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['on-2'])
  })

  it('filters by search query', async () => {
    const wrapper = mount(ExpertCaseSellableItemPicker, {
      props: {
        items,
        modelValue: null
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          UInput: uInputStub
        }
      }
    })

    await flushPromises()
    const search = wrapper.get('[data-testid="expert-case-sellable-picker-search"]')
    await search.setValue('維生素')
    await flushPromises()
    expect(wrapper.find('[data-testid="expert-case-sellable-picker-option-on-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-sellable-picker-option-on-1"]').exists()).toBe(false)
  })
})
