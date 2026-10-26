import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import KnowledgeTabs from './KnowledgeTabs.vue'

const routeState = reactive({ path: '/knowledge/datasets' })

const labels: Record<string, string> = {
  'knowledge.tabs.navLabel': '知識管理分頁',
  'knowledge.tabs.datasets': '資料集',
  'knowledge.tabs.chunks': '片段審核',
  'knowledge.tabs.retrievalPreview': '檢索預覽',
  'knowledge.tabs.audit': '稽核',
  'knowledge.tabs.datasetGroups': '群組',
  'knowledge.tabs.overview': '總覽',
  'knowledge.tabs.config': '設定',
  'knowledge.tabs.more': '更多',
  'knowledge.tabs.current': '目前',
  'knowledge.tabs.advanced': '進階'
}

function translate(key: string, params?: { name?: string }) {
  if (key === 'knowledge.tabs.moreWithPage') {
    return `更多 · ${params?.name ?? ''}`
  }
  return labels[key] ?? key
}

vi.stubGlobal('useLocalePath', () => (path: string) => path)
vi.stubGlobal('useRoute', () => routeState)
vi.stubGlobal('useI18n', () => ({ t: translate }))

const buttonStub = {
  name: 'UButton',
  props: ['to', 'label', 'color', 'variant', 'trailingIcon', 'size'],
  template: '<button type="button" :data-to="to" :data-label="label" :data-color="color" :data-variant="variant"><slot />{{ label }}</button>'
}

const dropdownStub = {
  name: 'UDropdownMenu',
  props: ['items', 'open', 'content', 'ui'],
  emits: ['update:open'],
  template: '<div data-testid="more-menu"><slot :open="Boolean(open)" /><ul><li v-for="(item, i) in items" :key="i" role="menuitem">{{ item.label }}</li></ul></div>'
}

function mountTabs() {
  return mount(KnowledgeTabs, {
    global: {
      stubs: {
        UButton: buttonStub,
        UDropdownMenu: dropdownStub
      },
      mocks: {
        $t: translate
      }
    }
  })
}

describe('KnowledgeTabs', () => {
  beforeEach(() => {
    routeState.path = '/knowledge/datasets'
  })

  it('renders four daily tabs plus a More trigger on daily routes', () => {
    const wrapper = mountTabs()

    const buttons = wrapper.findAllComponents({ name: 'UButton' })
    const dailyLabels = buttons
      .filter(b => b.props('to'))
      .map(b => b.text().trim())
    expect(dailyLabels).toEqual(['資料集', '片段審核', '檢索預覽', '稽核'])

    const more = buttons.find(b => !b.props('to'))
    expect(more?.props('label')).toBe('更多')
    expect(more?.props('variant')).toBe('outline')
    expect(more?.attributes('aria-haspopup')).toBe('menu')
    expect(wrapper.find('[data-testid="more-menu"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="menuitem"]').map(n => n.text())).toEqual([
      '群組',
      '總覽',
      '設定'
    ])
  })

  it('shows More · {name} as active when on an advanced route', () => {
    routeState.path = '/knowledge/dataset-groups'
    const wrapper = mountTabs()

    const more = wrapper.findAllComponents({ name: 'UButton' }).find(b => !b.props('to'))
    expect(more?.props('label')).toBe('更多 · 群組')
    expect(more?.props('color')).toBe('primary')
    expect(more?.props('variant')).toBe('soft')

    const dailyActive = wrapper
      .findAllComponents({ name: 'UButton' })
      .filter(b => b.props('to') && b.props('color') === 'primary')
    expect(dailyActive).toHaveLength(0)
  })
})
