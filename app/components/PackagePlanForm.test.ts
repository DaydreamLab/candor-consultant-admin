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
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
          },
          USelect: stub,
          UTextarea: stub,
          USwitch: stub,
          UButton: stub
        }
      }
    })

    await flushPromises()
    const nameInput = wrapper.findAll('input')[1]
    expect(nameInput).toBeDefined()
    await nameInput!.setValue('更新名稱')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const events = wrapper.emitted('save')
    expect(events).toBeTruthy()
    expect(events?.[0]?.[0]).toEqual({ name_zh: '更新名稱' })
  })
})
