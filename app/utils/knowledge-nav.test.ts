import { describe, expect, it } from 'vitest'
import {
  findActiveKnowledgeDailyTab,
  findActiveKnowledgeMoreTab,
  findKnowledgeTabByPath,
  isKnowledgeTabActive,
  KNOWLEDGE_DAILY_TABS,
  KNOWLEDGE_MORE_TABS,
  knowledgeCrumbs
} from './knowledge-nav'

describe('knowledge-nav Wave-2 tabs', () => {
  it('splits daily (4) and more (3) without overlapping routes', () => {
    expect(KNOWLEDGE_DAILY_TABS.map(t => t.key)).toEqual([
      'datasets',
      'chunks',
      'retrievalPreview',
      'audit'
    ])
    expect(KNOWLEDGE_MORE_TABS.map(t => t.key)).toEqual([
      'datasetGroups',
      'overview',
      'config'
    ])
    const routes = [...KNOWLEDGE_DAILY_TABS, ...KNOWLEDGE_MORE_TABS].map(t => t.to)
    expect(new Set(routes).size).toBe(7)
  })

  it('keeps detail child routes on the parent daily tab', () => {
    expect(isKnowledgeTabActive('/knowledge/datasets/ds_1', '/knowledge/datasets')).toBe(true)
    expect(isKnowledgeTabActive('/knowledge/chunks/c_1', '/knowledge/chunks')).toBe(true)
    expect(isKnowledgeTabActive('/knowledge/audit/datasets/ds_1', '/knowledge/audit')).toBe(true)
    expect(isKnowledgeTabActive('/knowledge/audit/datasets/ds_1', '/knowledge/datasets')).toBe(false)
    expect(findActiveKnowledgeDailyTab('/knowledge/datasets/ds_1')?.key).toBe('datasets')
  })

  it('marks advanced routes as more-active and daily-inactive', () => {
    expect(findActiveKnowledgeMoreTab('/knowledge/dataset-groups')?.key).toBe('datasetGroups')
    expect(findActiveKnowledgeMoreTab('/knowledge/overview')?.key).toBe('overview')
    expect(findActiveKnowledgeMoreTab('/knowledge/config')?.key).toBe('config')
    expect(findActiveKnowledgeDailyTab('/knowledge/dataset-groups')).toBeUndefined()
    expect(findActiveKnowledgeDailyTab('/knowledge/datasets')?.key).toBe('datasets')
  })

  it('does not confuse dataset-groups with datasets', () => {
    expect(isKnowledgeTabActive('/knowledge/dataset-groups', '/knowledge/datasets')).toBe(false)
    expect(findKnowledgeTabByPath('/knowledge/dataset-groups')?.key).toBe('datasetGroups')
  })

  it('builds crumbs with tab labels for daily and more routes', () => {
    const t = (key: string) => key
    const localePath = (to: string) => to
    expect(knowledgeCrumbs('/knowledge/chunks', t, localePath)).toEqual([
      { label: 'nav.knowledge', to: '/knowledge/datasets' },
      { label: 'knowledge.tabs.chunks' }
    ])
    expect(knowledgeCrumbs('/knowledge/config', t, localePath)).toEqual([
      { label: 'nav.knowledge', to: '/knowledge/datasets' },
      { label: 'knowledge.tabs.config' }
    ])
    expect(knowledgeCrumbs('/knowledge/datasets/x', t, localePath, 'Doc')).toEqual([
      { label: 'nav.knowledge', to: '/knowledge/datasets' },
      { label: 'knowledge.tabs.datasets', to: '/knowledge/datasets' },
      { label: 'Doc' }
    ])
  })
})
