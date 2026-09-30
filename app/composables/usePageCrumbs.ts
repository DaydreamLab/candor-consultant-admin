import type { BreadcrumbItem } from '@nuxt/ui'
import { NAV_GROUPS, normalizeAdminPath } from '~/utils/nav'

export function useSellableItemCrumbLabel() {
  return useState<string | null>('candor-sellable-item-label', () => null)
}

export function usePageCrumbs() {
  const route = useRoute()
  const localePath = useLocalePath()
  const { t } = useI18n()
  const orderLabel = useState<string | null>('candor-order-detail-label', () => null)
  const sellableItemLabel = useSellableItemCrumbLabel()

  const items = computed<BreadcrumbItem[]>(() => {
    const current = normalizeAdminPath(route.path)

    if (current === '/products/new') {
      return [
        { label: t('nav.products'), to: localePath('/products') },
        { label: t('products.createTitle') }
      ]
    }

    if (current.startsWith('/products/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.products'), to: localePath('/products') },
        { label: sellableItemLabel.value || id }
      ]
    }

    if (current.startsWith('/orders/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.orders'), to: localePath('/orders') },
        { label: orderLabel.value || id }
      ]
    }

    return [{ label: pageLabel(current) }]
  })

  function pageLabel(current: string) {
    if (current === '/products') {
      return t('products.listTitle')
    }
    if (current === '/account') {
      return t('nav.account')
    }
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.to === current) {
          return t(`nav.${item.key}`)
        }
      }
    }
    return t('brandAdmin')
  }

  return { items }
}
