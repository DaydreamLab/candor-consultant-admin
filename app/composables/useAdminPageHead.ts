import type { BreadcrumbItem } from '@nuxt/ui'

function crumbLabels(items: BreadcrumbItem[]): string[] {
  return items
    .map(item => (typeof item.label === 'string' ? item.label.trim() : ''))
    .filter(Boolean)
}

export function useAdminPageHead(crumbs: Ref<BreadcrumbItem[]>) {
  const { t } = useI18n()

  const documentTitle = computed(() => {
    const labels = crumbLabels(crumbs.value)
    const site = t('meta.title')
    if (!labels.length) {
      return site
    }
    return `${labels.join(' · ')} | ${site}`
  })

  useHead({
    title: documentTitle
  })

  useSeoMeta({
    title: documentTitle
  })
}
