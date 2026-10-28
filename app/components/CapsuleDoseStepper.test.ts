import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CapsuleDoseStepper from './CapsuleDoseStepper.vue'

describe('CapsuleDoseStepper', () => {
  it('disables minus at 1 and increments on plus', async () => {
    const wrapper = mount(CapsuleDoseStepper, {
      props: {
        modelValue: '1',
        testId: 'dose'
      },
      global: {
        mocks: {
          $t: (key: string) => (key === 'expertCaseReviews.doseUnit' ? '顆' : key)
        }
      }
    })

    expect(wrapper.find('[data-testid="dose-unit"]').text()).toBe('顆')
    expect(wrapper.find('[data-testid="dose-minus"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="dose-plus"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['2'])
  })

  it('allows decrement when value > 1', async () => {
    const wrapper = mount(CapsuleDoseStepper, {
      props: {
        modelValue: '3',
        testId: 'dose'
      },
      global: {
        mocks: { $t: () => '顆' }
      }
    })

    expect(wrapper.find('[data-testid="dose-minus"]').attributes('disabled')).toBeUndefined()
    await wrapper.find('[data-testid="dose-minus"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['2'])
  })
})
