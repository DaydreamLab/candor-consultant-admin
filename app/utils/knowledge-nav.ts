import type { BreadcrumbItem } from '@nuxt/ui'
import { normalizeAdminPath } from '~/utils/nav'

/** Wave-2：日常 primary tabs（頁內頂列） */
export const KNOWLEDGE_DAILY_TABS = [
  { key: 'datasets', to: '/knowledge/datasets' },
  { key: 'chunks', to: '/knowledge/chunks' },
  { key: 'retrievalPreview', to: '/knowledge/retrieval-preview' },
  { key: 'audit', to: '/knowledge/audit' }
] as const

/** Wave-2：進階項（收在「更多」dropdown） */
export const KNOWLEDGE_MORE_TABS = [
  { key: 'datasetGroups', to: '/knowledge/dataset-groups' },
  { key: 'overview', to: '/knowledge/overview' },
  { key: 'config', to: '/knowledge/config' }
] as const

export type KnowledgeTabKey
  = (typeof KNOWLEDGE_DAILY_TABS)[number]['key']
    | (typeof KNOWLEDGE_MORE_TABS)[number]['key']

export type KnowledgeTabDef = {
  key: KnowledgeTabKey
  to: string
}

const ALL_TABS: KnowledgeTabDef[] = [
  ...KNOWLEDGE_DAILY_TABS,
  ...KNOWLEDGE_MORE_TABS
]

/** 詳情子頁維持父 tab active（datasets/* → 資料集；chunks/* → 片段審核…） */
export function isKnowledgeTabActive(path: string, to: string): boolean {
  const current = normalizeAdminPath(path)
  if (to === '/knowledge/datasets') {
    return current === '/knowledge/datasets' || current.startsWith('/knowledge/datasets/')
  }
  return current === to || current.startsWith(`${to}/`)
}

export function findKnowledgeTabByPath(path: string): KnowledgeTabDef | undefined {
  return ALL_TABS.find(tab => isKnowledgeTabActive(path, tab.to))
}

export function findActiveKnowledgeDailyTab(path: string) {
  return KNOWLEDGE_DAILY_TABS.find(tab => isKnowledgeTabActive(path, tab.to))
}

export function findActiveKnowledgeMoreTab(path: string) {
  return KNOWLEDGE_MORE_TABS.find(tab => isKnowledgeTabActive(path, tab.to))
}

export function knowledgeCrumbs(
  path: string,
  t: (key: string) => string,
  localePath: (to: string) => string,
  tailLabel?: string | null
): BreadcrumbItem[] | null {
  const current = normalizeAdminPath(path)
  if (current !== '/knowledge' && !current.startsWith('/knowledge/')) {
    return null
  }

  const root: BreadcrumbItem = {
    label: t('nav.knowledge'),
    to: localePath('/knowledge/datasets')
  }

  if (current === '/knowledge') {
    return [{ label: t('nav.knowledge') }]
  }

  const tab = findKnowledgeTabByPath(current)
  if (!tab) {
    return [root]
  }

  if (tailLabel && current !== tab.to) {
    return [
      root,
      { label: t(`knowledge.tabs.${tab.key}`), to: localePath(tab.to) },
      { label: tailLabel }
    ]
  }

  return [
    root,
    { label: t(`knowledge.tabs.${tab.key}`) }
  ]
}
