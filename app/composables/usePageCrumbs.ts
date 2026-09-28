import type { BreadcrumbItem } from '@nuxt/ui'
import { NAV_GROUPS, normalizeAdminPath } from '~/utils/nav'

export function usePageCrumbs() {
  const route = useRoute()
  const localePath = useLocalePath()
  const { t, locale } = useI18n()
  const ops = useOpsStore()
  const orderLabel = useState<string | null>('candor-order-detail-label', () => null)

  const items = computed<BreadcrumbItem[]>(() => {
    const current = normalizeAdminPath(route.path)

    if (current === '/products/new') {
      return [
        { label: t('nav.products'), to: localePath('/products') },
        { label: t('actions.add') }
      ]
    }

    if (current.startsWith('/products/')) {
      const sku = String(route.params.sku ?? '')
      return [
        { label: t('nav.products'), to: localePath('/products') },
        { label: productLabel(sku) }
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

  function productLabel(sku: string) {
    const product = ops.productOf(sku)
    if (!product) {
      return sku
    }
    const name = locale.value === 'en' ? product.nameEn : product.name
    return name || sku
  }

  return { items }
}
