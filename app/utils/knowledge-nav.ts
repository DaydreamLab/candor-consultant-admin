import type { BreadcrumbItem } from '@nuxt/ui'
import { normalizeAdminPath } from '~/utils/nav'

const TAB_BY_PATH: { prefix: string, tab: string }[] = [
  { prefix: '/knowledge/datasets', tab: 'datasets' },
  { prefix: '/knowledge/chunks', tab: 'chunks' },
  { prefix: '/knowledge/retrieval-preview', tab: 'retrievalPreview' },
  { prefix: '/knowledge/audit', tab: 'audit' },
  { prefix: '/knowledge/dataset-groups', tab: 'datasetGroups' },
  { prefix: '/knowledge/overview', tab: 'overview' },
  { prefix: '/knowledge/config', tab: 'config' }
]

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

  const tab = TAB_BY_PATH.find(entry => current === entry.prefix || current.startsWith(`${entry.prefix}/`))
  if (!tab) {
    return [root]
  }

  if (tailLabel && current !== tab.prefix) {
    return [
      root,
      { label: t(`knowledge.tabs.${tab.tab}`), to: localePath(tab.prefix) },
      { label: tailLabel }
    ]
  }

  return [
    root,
    { label: t(`knowledge.tabs.${tab.tab}`) }
  ]
}
