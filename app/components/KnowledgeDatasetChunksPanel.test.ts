import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, toValue } from 'vue'
import KnowledgeDatasetChunksPanel from './KnowledgeDatasetChunksPanel.vue'
import type { KnowledgeChunk } from '~/types/knowledge'

const listMock = vi.fn()

vi.mock('~/utils/admin-api', () => ({
  AdminApiError: class AdminApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  adminListKnowledgeChunks: (...args: unknown[]) => listMock(...args)
}))

vi.mock('~/utils/operator-session', () => ({
  readOperatorToken: () => 'test-token'
}))

vi.mock('~/utils/knowledge-labels', () => ({
  reviewStatusBadgeColor: () => 'neutral'
}))

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { apiBase: 'https://api.example' }
}))
vi.stubGlobal('useLocalePath', () => (path: string) => path)
vi.stubGlobal('toValue', toValue)
vi.stubGlobal('usePager', (source: unknown, pageSize = 10) => {
  const page = ref(1)
  const all = computed(() => toValue(source as never) as KnowledgeChunk[])
  const total = computed(() => all.value.length)
  const rows = computed(() => {
    const start = (page.value - 1) * pageSize
    return all.value.slice(start, start + pageSize)
  })
  const from = computed(() => (total.value ? (page.value - 1) * pageSize + 1 : 0))
  const to = computed(() => Math.min(page.value * pageSize, total.value))
  return { page, pageSize, rows, total, from, to }
})

const stub = { template: '<div><slot /><slot name="header" /></div>' }

const approvedChunk: KnowledgeChunk = {
  id: 'c-approved',
  review_status: 'approved',
  dataset_id: 'ds-1',
  dataset_code: 'FDA',
  text_preview: 'approved text'
}

const pendingChunks: KnowledgeChunk[] = [
  {
    id: 'c-pending-1',
    review_status: 'pending',
    dataset_id: 'ds-1',
    dataset_code: 'FDA',
    text_preview: 'pending one'
  },
  {
    id: 'c-pending-2',
    review_status: 'pending',
    dataset_id: 'ds-1',
    dataset_code: 'FDA',
    text_preview: 'pending two'
  },
  {
    id: 'c-pending-3',
    review_status: 'pending',
    dataset_id: 'ds-1',
    dataset_code: 'FDA',
    text_preview: 'pending three'
  }
]

describe('KnowledgeDatasetChunksPanel status filter', () => {
  beforeEach(() => {
    listMock.mockReset()
    listMock.mockImplementation(async (_base: string, _token: string, query: { status?: string } = {}) => {
      if (query.status === 'pending') {
        return pendingChunks
      }
      return [approvedChunk]
    })
  })

  it('reloads with status when the filter changes and shows API pending rows', async () => {
    const wrapper = mount(KnowledgeDatasetChunksPanel, {
      props: {
        datasetId: 'ds-1',
        datasetCode: 'FDA',
        groupKey: 'fda'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          UCard: stub,
          UFormField: stub,
          USelect: {
            props: ['modelValue', 'items'],
            emits: ['update:modelValue'],
            template:
              '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>'
          },
          UAlert: true,
          UBadge: true,
          UButton: true,
          EmptyPanel: {
            props: ['title', 'description'],
            template: '<div class="empty" :data-title="title" :data-description="description" />'
          },
          ListPager: true
        }
      }
    })

    await flushPromises()
    expect(listMock).toHaveBeenCalledTimes(1)
    expect(listMock.mock.calls[0]?.[2]).toEqual({ group: 'fda' })
    expect(wrapper.text()).toContain('approved text')

    await wrapper.find('select').setValue('pending')
    await flushPromises()

    expect(listMock).toHaveBeenCalledTimes(2)
    expect(listMock.mock.calls[1]?.[2]).toEqual({ group: 'fda', status: 'pending' })
    expect(wrapper.text()).toContain('pending one')
    expect(wrapper.text()).toContain('pending three')
    expect(wrapper.text()).not.toContain('approved text')
  })

  it('shows generic empty copy when status=pending returns no rows', async () => {
    listMock.mockImplementation(async (_base: string, _token: string, query: { status?: string } = {}) => {
      if (query.status === 'pending') {
        return []
      }
      return [approvedChunk]
    })

    const wrapper = mount(KnowledgeDatasetChunksPanel, {
      props: {
        datasetId: 'ds-1',
        datasetCode: 'FDA',
        groupKey: 'fda'
      },
      global: {
        mocks: {
          $t: (key: string) => key
        },
        stubs: {
          UCard: stub,
          UFormField: stub,
          USelect: {
            props: ['modelValue', 'items'],
            emits: ['update:modelValue'],
            template:
              '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>'
          },
          UAlert: true,
          UBadge: true,
          UButton: true,
          EmptyPanel: {
            props: ['title', 'description'],
            template: '<div class="empty" :data-title="title" :data-description="description" />'
          },
          ListPager: true
        }
      }
    })

    await flushPromises()
    await wrapper.find('select').setValue('pending')
    await flushPromises()

    const empty = wrapper.find('.empty')
    expect(empty.exists()).toBe(true)
    expect(empty.attributes('data-title')).toBe('knowledge.datasets.detail.chunksEmptyTitle')
    expect(empty.attributes('data-description')).toBe('knowledge.datasets.detail.chunksEmpty')
    expect(wrapper.html()).not.toMatch(/beta|pendingFilterEmpty/i)
  })
})

// Keep watch imported so Vue reactivity helpers match Nuxt auto-imports in this file's mocks.
void watch
