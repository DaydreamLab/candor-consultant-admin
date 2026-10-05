import type { BreadcrumbItem } from '@nuxt/ui'
import { NAV_GROUPS, normalizeAdminPath } from '~/utils/nav'

export function useSellableItemCrumbLabel() {
  return useState<string | null>('candor-sellable-item-label', () => null)
}

export function usePackagePlanCrumbLabel() {
  return useState<string | null>('candor-package-plan-label', () => null)
}

export function useLabServiceCrumbLabel() {
  return useState<string | null>('candor-lab-service-label', () => null)
}

export function useLabAppointmentCrumbLabel() {
  return useState<string | null>('candor-lab-appointment-label', () => null)
}

export function usePageCrumbs() {
  const route = useRoute()
  const localePath = useLocalePath()
  const { t } = useI18n()
  const orderLabel = useState<string | null>('candor-order-detail-label', () => null)
  const userLabel = useState<string | null>('candor-user-detail-label', () => null)
  const sellableItemLabel = useSellableItemCrumbLabel()
  const packagePlanLabel = usePackagePlanCrumbLabel()
  const labServiceLabel = useLabServiceCrumbLabel()
  const labAppointmentLabel = useLabAppointmentCrumbLabel()
  const trainingBatchLabel = useState<string | null>('candor-training-batch-label', () => null)
  const weightSetLabel = useState<string | null>('candor-weight-set-label', () => null)

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

    if (current === '/lab-services/new') {
      return [
        { label: t('nav.labServices'), to: localePath('/lab-services') },
        { label: t('labServices.createTitle') }
      ]
    }

    if (current.startsWith('/lab-services/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.labServices'), to: localePath('/lab-services') },
        { label: labServiceLabel.value || id }
      ]
    }

    if (current.startsWith('/lab-appointments/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.labAppointments'), to: localePath('/lab-appointments') },
        { label: labAppointmentLabel.value || id }
      ]
    }

    if (current.startsWith('/package-plans/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.packagePlans'), to: localePath('/package-plans') },
        { label: packagePlanLabel.value || id }
      ]
    }

    if (current.startsWith('/orders/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.orders'), to: localePath('/orders') },
        { label: orderLabel.value || id }
      ]
    }

    if (current.startsWith('/expert-tuning/weights/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.expertTuning'), to: localePath('/expert-tuning') },
        { label: t('expertTuning.tabs.weights'), to: localePath('/expert-tuning') },
        { label: weightSetLabel.value || id }
      ]
    }

    if (current === '/ai-assistant/site') {
      return [
        { label: t('nav.aiAssistant'), to: localePath('/ai-assistant') },
        { label: t('aiAssistant.tabs.site') }
      ]
    }

    if (current === '/ai-assistant/claim-terms') {
      return [
        { label: t('nav.aiAssistant'), to: localePath('/ai-assistant') },
        { label: t('aiAssistant.tabs.claimTerms') }
      ]
    }

    if (current === '/expert-tuning/training') {
      return [
        { label: t('nav.expertTuning'), to: localePath('/expert-tuning') },
        { label: t('expertTuning.tabs.training') }
      ]
    }

    if (current.startsWith('/expert-tuning/training/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.expertTuning'), to: localePath('/expert-tuning') },
        { label: t('expertTuning.tabs.training'), to: localePath('/expert-tuning/training') },
        { label: trainingBatchLabel.value || id }
      ]
    }

    if (current.startsWith('/users/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.users'), to: localePath('/users') },
        { label: userLabel.value || id }
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
