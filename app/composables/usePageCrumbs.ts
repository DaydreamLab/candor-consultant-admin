import type { BreadcrumbItem } from '@nuxt/ui'
import { knowledgeCrumbs } from '~/utils/knowledge-nav'
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

export function useExpertCaseCrumbLabel() {
  return useState<string | null>('candor-expert-case-label', () => null)
}

export function useExpertPlanCrumbLabel() {
  return useState<string | null>('candor-expert-plan-label', () => null)
}

export function useExpertBookingCrumbLabel() {
  return useState<string | null>('candor-expert-booking-label', () => null)
}

export function usePageCrumbs() {
  const route = useRoute()
  const localePath = useLocalePath()
  const { t } = useI18n()
  const orderLabel = useState<string | null>('candor-order-detail-label', () => null)
  const userLabel = useState<string | null>('candor-user-detail-label', () => null)
  const sellableItemLabel = useSellableItemCrumbLabel()
  const packagePlanLabel = usePackagePlanCrumbLabel()
  const expertPlanLabel = useExpertPlanCrumbLabel()
  const expertBookingLabel = useExpertBookingCrumbLabel()
  const labServiceLabel = useLabServiceCrumbLabel()
  const labAppointmentLabel = useLabAppointmentCrumbLabel()
  const expertCaseLabel = useExpertCaseCrumbLabel()
  const trainingBatchLabel = useState<string | null>('candor-training-batch-label', () => null)
  const weightSetLabel = useState<string | null>('candor-weight-set-label', () => null)

  function knowledgeTailLabel(current: string): string | undefined {
    if (current.startsWith('/knowledge/datasets/') && current !== '/knowledge/datasets') {
      const id = String(route.params.id ?? '').trim()
      return id || undefined
    }
    if (current.startsWith('/knowledge/audit/chunks/')) {
      const id = String(route.params.id ?? '').trim()
      return id || undefined
    }
    if (current.startsWith('/knowledge/audit/datasets/')) {
      const id = String(route.params.id ?? '').trim()
      return id || undefined
    }
    return undefined
  }

  const items = computed<BreadcrumbItem[]>(() => {
    const current = normalizeAdminPath(route.path)

    if (current === '/knowledge' || current.startsWith('/knowledge/')) {
      const knowledge = knowledgeCrumbs(current, t, localePath, knowledgeTailLabel(current))
      if (knowledge?.length) {
        return knowledge
      }
      return [{ label: t('nav.knowledge') }]
    }

    if (current === '/supplements/new') {
      return [
        { label: t('nav.supplements'), to: localePath('/supplements') },
        { label: t('supplements.createTitle') }
      ]
    }

    if (current.startsWith('/supplements/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.supplements'), to: localePath('/supplements') },
        { label: sellableItemLabel.value || id }
      ]
    }

    if (current === '/checkups/new') {
      return [
        { label: t('nav.checkups'), to: localePath('/checkups') },
        { label: t('checkups.createTitle') }
      ]
    }

    if (current.startsWith('/checkups/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.checkups'), to: localePath('/checkups') },
        { label: labServiceLabel.value || id }
      ]
    }

    if (current.startsWith('/lab-appointments/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.appointments'), to: localePath('/lab-appointments') },
        { label: labAppointmentLabel.value || id }
      ]
    }

    if (current.endsWith('/selections') && current.includes('/expert-bookings/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.expertBookings'), to: localePath('/expert-bookings') },
        {
          label: expertBookingLabel.value || id,
          to: localePath(`/expert-bookings/${encodeURIComponent(id)}`)
        },
        { label: t('expertBookings.selections.crumb') }
      ]
    }

    if (current.startsWith('/expert-bookings/')) {
      return [
        { label: t('nav.expertBookings'), to: localePath('/expert-bookings') },
        { label: expertBookingLabel.value || t('expertBookings.details') }
      ]
    }

    if (current === '/package-plans/new') {
      return [
        { label: t('nav.plans'), to: localePath('/package-plans') },
        { label: t('plans.createTitle') }
      ]
    }

    if (current.startsWith('/package-plans/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.plans'), to: localePath('/package-plans') },
        { label: packagePlanLabel.value || id }
      ]
    }

    if (current === '/expert-plans/new') {
      return [
        { label: t('nav.expertPlans'), to: localePath('/expert-plans') },
        { label: t('expertPlans.createTitle') }
      ]
    }

    if (current.startsWith('/expert-plans/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.expertPlans'), to: localePath('/expert-plans') },
        { label: expertPlanLabel.value || id }
      ]
    }

    if (current.startsWith('/orders/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.orders'), to: localePath('/orders') },
        { label: orderLabel.value || id }
      ]
    }

    if (current.startsWith('/custom/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.custom'), to: localePath('/custom') },
        { label: expertCaseLabel.value || id }
      ]
    }

    if (current.startsWith('/weights/') && current !== '/weights/daily-learning' && !current.startsWith('/weights/training')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.weights'), to: localePath('/weights') },
        { label: weightSetLabel.value || id }
      ]
    }

    if (current === '/assistant/site') {
      return [
        { label: t('nav.assistant'), to: localePath('/assistant') },
        { label: t('assistant.tabs.site') }
      ]
    }

    if (current === '/assistant/claim-terms') {
      return [
        { label: t('nav.assistant'), to: localePath('/assistant') },
        { label: t('assistant.tabs.claimTerms') }
      ]
    }

    if (current === '/weights/training') {
      return [
        { label: t('nav.weights'), to: localePath('/weights') },
        { label: t('weights.tabs.training') }
      ]
    }

    if (current.startsWith('/weights/training/')) {
      const id = String(route.params.id ?? '')
      return [
        { label: t('nav.weights'), to: localePath('/weights') },
        { label: t('weights.tabs.training'), to: localePath('/weights/training') },
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
    if (current === '/supplements') {
      return t('supplements.listTitle')
    }
    if (current === '/account') {
      return t('nav.account')
    }
    if (current.startsWith('/knowledge/')) {
      return t('nav.knowledge')
    }
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const itemPath = item.to.split('#')[0] || item.to
        if (itemPath === current) {
          return t(`nav.${item.key}`)
        }
      }
    }
    return t('brandAdmin')
  }

  return { items }
}
