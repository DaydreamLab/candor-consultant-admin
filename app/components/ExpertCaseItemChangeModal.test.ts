import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExpertCaseItemChangeModal from './ExpertCaseItemChangeModal.vue'
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
  }
]

const stubs = {
  UModal: {
    props: ['open', 'title'],
    template: '<div v-if="open"><slot name="body" /><slot name="footer" :close="() => {}" /></div>'
  },
  UFormField: { template: '<div><slot /><slot name="hint" /></div>' },
  CapsuleDoseStepper: {
    props: ['modelValue', 'disabled', 'invalid', 'testId'],
    emits: ['update:modelValue'],
    template:
      '<input :data-testid="testId + \'-input\'" :value="modelValue" '
      + '@input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  UTextarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  UButton: {
    props: ['disabled'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  ExpertCaseSellableItemPicker: {
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
    template: '<button data-testid="pick" @click="$emit(\'update:modelValue\', items[0].id)">pick</button>'
  }
}

describe('ExpertCaseItemChangeModal', () => {
  it('blocks confirm without reason and shows member-facing hint', async () => {
    const wrapper = mount(ExpertCaseItemChangeModal, {
      props: {
        open: true,
        mode: 'swap',
        items,
        initialSellableId: 'on-1'
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs
      }
    })

    await flushPromises()
    expect(wrapper.find('[data-testid="expert-case-item-change-reason-hint"]').text())
      .toContain('expertCaseReviews.reasonMemberFacingHint')

    await wrapper.find('[data-testid="expert-case-item-change-confirm"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="expert-case-item-change-error"]').text())
      .toContain('expertCaseReviews.reasonRequiredMemberFacing')
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('emits confirm when product, dose, and reason are set', async () => {
    const wrapper = mount(ExpertCaseItemChangeModal, {
      props: {
        open: true,
        mode: 'add',
        items
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs
      }
    })

    await flushPromises()
    await wrapper.find('[data-testid="pick"]').trigger('click')
    await wrapper.find('[data-testid="expert-case-item-change-reason"]').setValue('適合補充油脂')
    await flushPromises()
    await wrapper.find('[data-testid="expert-case-item-change-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('confirm')?.[0]).toEqual([{
      sellableItemId: 'on-1',
      dailyDose: 1,
      reason: '適合補充油脂'
    }])
  })

  it('rejects non-integer / 0 capsule dose with fixed error copy', async () => {
    const wrapper = mount(ExpertCaseItemChangeModal, {
      props: {
        open: true,
        mode: 'swap',
        items,
        initialSellableId: 'on-1'
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs
      }
    })

    await flushPromises()
    await wrapper.find('[data-testid="expert-case-item-change-dose-input"]').setValue('0')
    await wrapper.find('[data-testid="expert-case-item-change-reason"]').setValue('調整')
    await flushPromises()
    await wrapper.find('[data-testid="expert-case-item-change-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="expert-case-item-change-dose-error"]').text())
      .toContain('expertCaseReviews.doseInvalid')
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })
})
