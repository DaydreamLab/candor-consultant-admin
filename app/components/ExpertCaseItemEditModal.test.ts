import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExpertCaseItemEditModal from './ExpertCaseItemEditModal.vue'

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
  }
}

describe('ExpertCaseItemEditModal', () => {
  it('blocks apply without a decision', async () => {
    const wrapper = mount(ExpertCaseItemEditModal, {
      props: {
        open: true,
        itemTitle: 'Magnesium'
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs
      }
    })

    await flushPromises()
    await wrapper.find('[data-testid="expert-case-edit-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="expert-case-edit-error"]').text())
      .toContain('expertCaseReviews.editItemDecisionRequired')
    expect(wrapper.emitted('apply')).toBeFalsy()
  })

  it('requires admin reason for reject', async () => {
    const wrapper = mount(ExpertCaseItemEditModal, {
      props: {
        open: true,
        itemTitle: 'Magnesium'
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs
      }
    })

    await flushPromises()
    await wrapper.find('[data-testid="expert-case-edit-reject"]').trigger('click')
    await wrapper.find('[data-testid="expert-case-edit-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="expert-case-edit-error"]').text())
      .toContain('expertCaseReviews.reasonRequiredAdminOnly')
    expect(wrapper.emitted('apply')).toBeFalsy()
  })

  it('emits apply for approve', async () => {
    const wrapper = mount(ExpertCaseItemEditModal, {
      props: {
        open: true,
        itemTitle: 'Magnesium'
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs
      }
    })

    await flushPromises()
    await wrapper.find('[data-testid="expert-case-edit-approve"]').trigger('click')
    await wrapper.find('[data-testid="expert-case-edit-confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('apply')?.[0]).toEqual([{
      decision: 'approve',
      reason: '',
      dailyDose: null
    }])
  })

  it('emits request-swap without applying', async () => {
    const wrapper = mount(ExpertCaseItemEditModal, {
      props: {
        open: true,
        itemTitle: 'Magnesium'
      },
      global: {
        mocks: { $t: (key: string) => key },
        stubs
      }
    })

    await flushPromises()
    await wrapper.find('[data-testid="expert-case-edit-swap"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('request-swap')).toBeTruthy()
    expect(wrapper.emitted('apply')).toBeFalsy()
  })
})
