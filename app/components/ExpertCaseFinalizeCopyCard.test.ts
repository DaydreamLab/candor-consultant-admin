import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExpertCaseFinalizeCopyCard from './ExpertCaseFinalizeCopyCard.vue'
import {
  EXPERT_FINALIZE_COPY_MOCK,
  resetExpertFinalizeCopyMockCache
} from '~/utils/expert-finalize-copy'

const generateMock = vi.fn()
const notifyMock = vi.fn()

vi.mock('~/utils/admin-api', () => ({
  AdminApiError: class AdminApiError extends Error {
    statusCode: number
    constructor(statusCode: number, message: string) {
      super(message)
      this.statusCode = statusCode
    }
  },
  adminGenerateExpertCaseFinalizeCopy: (...args: unknown[]) => generateMock(...args)
}))

vi.mock('~/utils/operator-session', () => ({
  readOperatorToken: () => 'tok'
}))

vi.mock('~/utils/expert-finalize-copy', async () => {
  const actual = await vi.importActual<typeof import('~/utils/expert-finalize-copy')>(
    '~/utils/expert-finalize-copy'
  )
  return {
    ...actual,
    isExpertFinalizeCopyMockEnabled: () => false
  }
})

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { apiBase: 'https://example.test/api/v1' }
}))

vi.stubGlobal('useOpsFeedback', () => ({
  notify: notifyMock
}))

vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key
}))

const stubs = {
  UBadge: {
    props: ['color'],
    template: '<span data-stub="badge"><slot /></span>'
  },
  UIcon: { template: '<i />' },
  UButton: {
    props: ['disabled', 'loading'],
    template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
  },
  UModal: {
    props: ['open', 'title', 'description'],
    emits: ['update:open'],
    template: `
      <div v-if="open" data-testid="overwrite-modal">
        <p>{{ title }}</p>
        <slot name="footer" :close="() => $emit('update:open', false)" />
      </div>
    `
  },
  MarkdownPreview: {
    props: ['source'],
    template: '<div data-testid="md-preview">{{ source }}</div>'
  }
}

describe('ExpertCaseFinalizeCopyCard', () => {
  beforeEach(() => {
    generateMock.mockReset()
    notifyMock.mockReset()
    resetExpertFinalizeCopyMockCache()
  })

  afterEach(() => {
    resetExpertFinalizeCopyMockCache()
  })

  it('shows empty placeholders and generate button', () => {
    const wrapper = mount(ExpertCaseFinalizeCopyCard, {
      props: {
        caseId: 'c1',
        locked: false,
        reportHighlights: '',
        expertOpinion: ''
      },
      global: { stubs, mocks: { $t: (k: string) => k } }
    })
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-generate"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-empty-report"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-empty-opinion"]').exists()).toBe(true)
  })

  it('generate loads draft and shows cache chip without toast when cache_hit', async () => {
    generateMock.mockResolvedValue({
      ...EXPERT_FINALIZE_COPY_MOCK,
      cache_hit: true
    })
    const wrapper = mount(ExpertCaseFinalizeCopyCard, {
      props: {
        caseId: 'c1',
        locked: false,
        reportHighlights: '',
        expertOpinion: ''
      },
      global: { stubs, mocks: { $t: (k: string) => k } }
    })

    await wrapper.find('[data-testid="expert-case-finalize-copy-generate"]').trigger('click')
    await flushPromises()

    expect(generateMock).toHaveBeenCalledWith(
      'https://example.test/api/v1',
      'tok',
      'c1',
      { force: false }
    )
    expect(wrapper.emitted('update:reportHighlights')?.[0]).toEqual([
      EXPERT_FINALIZE_COPY_MOCK.report_highlights
    ])
    expect(wrapper.emitted('update:expertOpinion')?.[0]).toEqual([
      EXPERT_FINALIZE_COPY_MOCK.expert_opinion
    ])
    expect(notifyMock).not.toHaveBeenCalled()

    await wrapper.setProps({
      reportHighlights: EXPERT_FINALIZE_COPY_MOCK.report_highlights,
      expertOpinion: EXPERT_FINALIZE_COPY_MOCK.expert_opinion
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-cache-chip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-regenerate"]').exists()).toBe(true)
  })

  it('dirty regenerate opens overwrite modal; confirm forces generate', async () => {
    generateMock.mockResolvedValue({
      ...EXPERT_FINALIZE_COPY_MOCK,
      cache_hit: false
    })
    const wrapper = mount(ExpertCaseFinalizeCopyCard, {
      props: {
        caseId: 'c2',
        locked: false,
        reportHighlights: EXPERT_FINALIZE_COPY_MOCK.report_highlights,
        expertOpinion: EXPERT_FINALIZE_COPY_MOCK.expert_opinion
      },
      global: { stubs, mocks: { $t: (k: string) => k } }
    })

    // Hydrate sets baseline = props; edit to make dirty
    await wrapper.find('[data-testid="expert-case-finalize-copy-report-textarea"]')
      .setValue(`${EXPERT_FINALIZE_COPY_MOCK.report_highlights}\nedited`)
    await flushPromises()
    await wrapper.setProps({
      reportHighlights: `${EXPERT_FINALIZE_COPY_MOCK.report_highlights}\nedited`
    })

    await wrapper.find('[data-testid="expert-case-finalize-copy-regenerate"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="overwrite-modal"]').exists()).toBe(true)

    await wrapper.find('[data-testid="expert-case-finalize-copy-overwrite-confirm"]').trigger('click')
    await flushPromises()
    expect(generateMock).toHaveBeenCalledWith(
      'https://example.test/api/v1',
      'tok',
      'c2',
      { force: true }
    )
  })

  it('locked state hides generate and shows readonly chip', () => {
    const wrapper = mount(ExpertCaseFinalizeCopyCard, {
      props: {
        caseId: 'c3',
        locked: true,
        reportHighlights: 'locked highlights',
        expertOpinion: 'locked opinion'
      },
      global: { stubs, mocks: { $t: (k: string) => k } }
    })
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-generate"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-regenerate"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-locked-chip"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="expert-case-finalize-copy-locked-report"]').text())
      .toContain('locked highlights')
  })
})
