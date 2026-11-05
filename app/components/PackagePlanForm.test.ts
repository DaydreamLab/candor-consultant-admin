import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PackagePlanForm from './PackagePlanForm.vue'

const stub = { template: '<div><slot /></div>' }

const plan = {
  id: 'pp-1',
  code: 'standard',
  name_zh: '標準方案',
  name_en: null,
  description: null,
  price: 3000,
  period_days: 30,
  pack_capacity: 8,
  core_count: 3,
  sort_order: 0,
  active: true
}

describe('PackagePlanForm', () => {
  it('emits a patch when a field changes', async () => {
    const wrapper = mount(PackagePlanForm, {
      props: {
        mode: 'update',
        packagePlan: plan,
        saving: false
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          UFormField: stub,
          UInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          USelect: stub,
          UTextarea: stub,
          USwitch: stub,
          UButton: stub,
          UBadge: stub
        }
      }
    })

    await flushPromises()
    const nameInput = wrapper.find('[data-testid="package-plan-name-zh"]')
    expect(nameInput.exists()).toBe(true)
    await nameInput.setValue('更新名稱')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const events = wrapper.emitted('save')
    expect(events).toBeTruthy()
    expect(events?.[0]?.[0]).toEqual({ name_zh: '更新名稱' })
  })

  it('emits no-changes when submit without edits', async () => {
    const wrapper = mount(PackagePlanForm, {
      props: {
        mode: 'update',
        packagePlan: plan,
        saving: false
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          UFormField: stub,
          UInput: stub,
          USelect: stub,
          UTextarea: stub,
          USwitch: stub,
          UButton: stub,
          UBadge: stub
        }
      }
    })

    await flushPromises()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('no-changes')).toHaveLength(1)
  })

  it('create mode shows all field errors at once', async () => {
    const inputStub = {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    }
    const wrapper = mount(PackagePlanForm, {
      props: {
        mode: 'create',
        packagePlan: null,
        saving: false
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          UFormField: {
            props: ['error', 'label'],
            template: '<div><slot /><span v-if="error" class="err">{{ error }}</span></div>'
          },
          UInput: inputStub,
          USelect: stub,
          UTextarea: stub,
          USwitch: stub,
          UButton: stub,
          UBadge: stub
        }
      }
    })

    await flushPromises()
    await wrapper.find('[data-testid="package-plan-price"]').setValue('0')
    await wrapper.find('[data-testid="package-plan-pack-capacity"]').setValue('0')
    await wrapper.find('[data-testid="package-plan-core-count"]').setValue('5')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('[data-testid="package-plan-create-top-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="package-plan-code"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="package-plan-ai-hint"]').exists()).toBe(true)
  })
})
