<script setup lang="ts">
import type { ApiShipStatus } from '~/types/admin'
import { AdminApiError, adminGetOrder } from '~/utils/admin-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'
import { adminListShipments } from '~/utils/shipment-api'
import { displayOrderNo, mapApiShipStatus } from '~/utils/shipment-map'

type BadgeColor = 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'
type BadgeVariant = 'outline' | 'soft'

const STATUS_BADGE: Record<ApiShipStatus, { color: BadgeColor, variant: BadgeVariant }> = {
  picking: { color: 'info', variant: 'soft' },
  in_transit: { color: 'primary', variant: 'soft' },
  arrived: { color: 'success', variant: 'soft' }
}

const config = useRuntimeConfig()
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const shipLabel = useState<string | null>('candor-shipping-detail-label', () => null)

const shipmentId = computed(() => String(route.params.id ?? ''))
const title = computed(() => shipLabel.value || shipmentId.value)

const pending = ref(true)
const errorMessage = ref('')
const order = ref<Record<string, unknown> | null>(null)
const shipment = ref<Record<string, unknown> | null>(null)
let loadSeq = 0

const orderNo = computed(() => optionalText(order.value?.order_no) || optionalText(shipment.value?.order_no) || t('status.na'))
const recipientName = computed(() => optionalText(order.value?.recipient_name) || optionalText(shipment.value?.recipient_name))
const packagePlanName = computed(() => {
  const pkg = recordOf(order.value?.package)
  return optionalText(pkg?.package_plan_name)
    || optionalText(shipment.value?.package_plan_name)
    || t('status.na')
})
const periodDays = computed(() => {
  const pkg = recordOf(order.value?.package)
  return optionalText(pkg?.period_days)
})
const components = computed(() => {
  const pkg = recordOf(order.value?.package)
  return recordsOf(pkg?.components)
})
const apiStatus = computed(() => mapApiShipStatus(shipment.value?.status))
const tracking = computed(() => optionalText(shipment.value?.tracking_no) || optionalText(shipment.value?.tracking))
const carrier = computed(() => optionalText(shipment.value?.carrier))
const trackingLine = computed(() => {
  if (!tracking.value) {
    return ''
  }
  return carrier.value ? `${carrier.value} · ${tracking.value}` : tracking.value
})
const updatedAt = computed(() => {
  return formatLocalDateTime(shipment.value?.updated_at, { style: 'list', empty: t('status.na') })
})

if (import.meta.client) {
  watch(shipmentId, (id) => {
    void load(id)
  }, { immediate: true })
}

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/shipping/')) {
    shipLabel.value = null
  }
})

async function load(id: string) {
  const seq = ++loadSeq
  shipLabel.value = null
  order.value = null
  shipment.value = null
  errorMessage.value = ''
  pending.value = true

  const token = readOperatorToken()
  if (!token || !id) {
    pending.value = false
    errorMessage.value = t('shipping.detailFailed')
    return
  }

  try {
    const listed = await adminListShipments(config.public.apiBase, token, {
      q: id,
      limit: 20,
      offset: 0
    })
    if (seq !== loadSeq || shipmentId.value !== id) {
      return
    }
    const row = listed.find(item => item.id === id) ?? null
    if (!row) {
      errorMessage.value = t('shipping.detailFailed')
      return
    }

    const orderId = typeof row.orderId === 'string' ? row.orderId.trim() : ''
    if (!orderId) {
      errorMessage.value = t('shipping.detailFailed')
      return
    }

    const detail = await adminGetOrder(config.public.apiBase, token, orderId)
    if (seq !== loadSeq || shipmentId.value !== id) {
      return
    }

    order.value = detail
    const nested = recordOf(detail.shipment)
    shipment.value = nested && optionalText(nested.id) === id
      ? nested
      : {
          id: row.id,
          order_id: row.orderId,
          order_no: row.orderNo,
          recipient_name: row.customer,
          package_plan_name: row.packagePlanName,
          status: row.apiStatus ?? row.status,
          tracking_no: row.tracking,
          updated_at: row.updatedAt
        }

    const label = typeof detail.order_no === 'string' && detail.order_no.trim()
      ? detail.order_no.trim()
      : displayOrderNo(row)
    shipLabel.value = label
  } catch (error) {
    if (seq !== loadSeq || shipmentId.value !== id) {
      return
    }
    order.value = null
    shipment.value = null
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    errorMessage.value = message || t('shipping.detailFailed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function badgeOf() {
  const value = apiStatus.value
  const style = value
    ? STATUS_BADGE[value]
    : { color: 'neutral' as const, variant: 'outline' as const }
  return {
    label: statusLabel(value),
    color: style.color,
    variant: style.variant
  }
}

function statusLabel(value: ApiShipStatus | null) {
  if (!value) {
    return t('status.na')
  }
  const key = `orders.shipmentStatus.${value}`
  const translated = t(key)
  return translated === key ? value : translated
}

function componentKey(row: Record<string, unknown>, index: number) {
  return optionalText(row.id) || optionalText(row.sellable_item_code) || `component-${index}`
}

function componentName(row: Record<string, unknown>) {
  return optionalText(row.sellable_item_name)
    || optionalText(row.name)
    || optionalText(row.sellable_item_code)
    || t('status.na')
}

function doseOf(row: Record<string, unknown>) {
  return optionalText(row.daily_dose) || t('status.na')
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function recordsOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    : []
}

function optionalText(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}
</script>

<template>
  <PageHeader
    :title="title"
    :description="recipientName || undefined"
    plain
  >
    <template #actions>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-arrow-left"
        :to="localePath('/shipping')"
        data-testid="shipping-back"
      >
        {{ $t('shipping.backToList') }}
      </UButton>
    </template>

    <div class="flex flex-col gap-4">
      <p
        v-if="errorMessage"
        class="text-sm text-error"
        data-testid="shipping-detail-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="pending"
        class="text-sm text-muted"
        data-testid="shipping-detail-loading"
      >
        {{ $t('shipping.loading') }}
      </p>
      <template v-else>
        <div
          class="flex flex-wrap items-center gap-3 rounded-xl border border-default bg-elevated px-4 py-3"
          data-testid="shipping-detail-summary"
        >
          <UBadge
            size="sm"
            v-bind="badgeOf()"
          />
          <span class="font-mono text-sm text-highlighted">
            {{ orderNo }}
          </span>
          <span class="text-sm text-muted">
            {{ packagePlanName }}
            <template v-if="periodDays">
              · {{ $t('shipping.periodDays', { days: periodDays }) }}
            </template>
          </span>
          <span
            v-if="trackingLine"
            class="font-mono text-sm text-muted"
          >
            {{ trackingLine }}
          </span>
          <span class="ml-auto text-sm text-muted">
            {{ updatedAt }}
          </span>
        </div>

        <section
          class="overflow-hidden rounded-xl border border-default bg-elevated"
          data-testid="shipping-package"
        >
          <div class="border-b border-default px-4 py-3">
            <h2 class="text-base font-semibold text-highlighted">
              {{ $t('shipping.sections.package') }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{ $t('shipping.sections.packageHint') }}
            </p>
          </div>
          <p
            v-if="!components.length"
            class="px-4 py-10 text-center text-base text-muted"
          >
            {{ $t('shipping.packageEmpty') }}
          </p>
          <div
            v-else
            class="overflow-x-auto"
          >
            <table class="w-full text-left text-sm">
              <thead class="border-b border-default bg-muted/40 text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('shipping.packageColumns.name') }}
                  </th>
                  <th class="px-4 py-3 text-center font-medium">
                    {{ $t('shipping.packageColumns.dose') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in components"
                  :key="componentKey(row, index)"
                  class="border-b border-default last:border-0"
                >
                  <td class="px-4 py-3 text-highlighted">
                    {{ componentName(row) }}
                  </td>
                  <td class="px-4 py-3 text-center font-medium text-highlighted">
                    {{ doseOf(row) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </PageHeader>
</template>
