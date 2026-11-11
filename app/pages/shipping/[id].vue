<script setup lang="ts">
import type { ApiShipStatus } from '~/types/admin'
import {
  AdminApiError,
  adminGetOrder,
  adminStartOrderShipment,
  isRefundRequestPendingError
} from '~/utils/admin-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { normalizeAdminPath } from '~/utils/nav'
import {
  orderBlocksPickingDueToRefund,
  orderRefundStatus
} from '~/utils/order-refund-gate'
import { readOperatorToken } from '~/utils/operator-session'
import { adminListShipments } from '~/utils/shipment-api'
import { displayOrderNo } from '~/utils/shipment-map'
import { bottleAddonsOf } from '~/utils/order-bottle-addon'
import {
  resolveShippingPhase,
  shippingPhaseSteps,
  type ShippingPhaseKey
} from '~/utils/shipping-phase'

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
const advancePending = ref(false)
const advanceError = ref('')
const order = ref<Record<string, unknown> | null>(null)
const shipment = ref<Record<string, unknown> | null>(null)
let loadSeq = 0
const feedback = useOpsFeedback()

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
const bottleAddons = computed(() => bottleAddonsOf(order.value))
const phase = computed(() => resolveShippingPhase(order.value, shipment.value))
const apiStatus = computed(() => {
  if (phase.value === 'picking' || phase.value === 'in_transit' || phase.value === 'arrived') {
    return phase.value
  }
  return null
})
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

const refundRequestStatus = computed(() => orderRefundStatus(order.value))

/** B-17／C19：退款申請處理中不能開始理貨（core `refund_status`／`refund_request_pending`）. */
const pickingBlockedByRefund = computed(() => orderBlocksPickingDueToRefund(order.value))

const orderIdForShipment = computed(() => {
  return optionalText(order.value?.id)
    || optionalText(shipment.value?.order_id)
})

const showAdvanceToPicking = computed(() => {
  if (pickingBlockedByRefund.value) {
    return true
  }
  // 定稿不自動建 shipment；訂單確認中（已付款、尚無出貨）可 POST 開始理貨
  return phase.value === 'order_confirmed'
})

const phaseRows = computed(() => {
  const current = phase.value
  const steps = shippingPhaseSteps()
  const currentIndex = current ? steps.indexOf(current) : -1
  return steps.map((key, index) => ({
    key,
    label: phaseLabel(key),
    current: key === current,
    done: currentIndex >= 0 && index < currentIndex
  }))
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

    if (row) {
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
      return
    }

    // 尚無出貨記錄：route id 當 order id（B-17 訂單確認中）
    const detail = await adminGetOrder(config.public.apiBase, token, id)
    if (seq !== loadSeq || shipmentId.value !== id) {
      return
    }
    order.value = detail
    shipment.value = recordOf(detail.shipment)
    shipLabel.value = optionalText(detail.order_no) || id
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
    label: phaseLabel(phase.value),
    color: style.color,
    variant: style.variant
  }
}

function phaseLabel(value: ShippingPhaseKey | null) {
  if (!value) {
    return t('status.na')
  }
  if (value === 'order_confirmed') {
    return t('shipping.phaseOrderConfirmed')
  }
  if (value === 'picking') {
    return t('shipping.pickingStatusLabel')
  }
  if (value === 'in_transit') {
    return t('shipping.phaseShipped')
  }
  if (value === 'arrived') {
    return t('shipping.phaseDelivered')
  }
  return t('status.na')
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

function bottleAddonKey(row: { sellable_item_id: string, sellable_item_sku: string }, index: number) {
  return row.sellable_item_id || row.sellable_item_sku || `bottle-addon-${index}`
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

async function advanceToPicking() {
  const token = readOperatorToken()
  const orderId = orderIdForShipment.value
  advanceError.value = ''
  if (!token || !orderId || pickingBlockedByRefund.value || advancePending.value) {
    if (pickingBlockedByRefund.value) {
      advanceError.value = t('shipping.refundBlocksPicking')
    }
    return
  }
  advancePending.value = true
  try {
    await adminStartOrderShipment(config.public.apiBase, token, orderId)
    feedback.notify({
      title: t('shipping.advanceOk'),
      color: 'success'
    })
    await load(shipmentId.value)
  } catch (error) {
    if (isRefundRequestPendingError(error)) {
      advanceError.value = t('shipping.refundBlocksPicking')
      return
    }
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    advanceError.value = message || t('shipping.advanceFailed')
  } finally {
    advancePending.value = false
  }
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
            data-testid="shipping-phase-badge"
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
            v-if="refundRequestStatus"
            class="text-sm text-muted"
            data-testid="shipping-refund-request-status"
          >
            {{ $t('shipping.refundRequestLabel') }}：{{
              refundRequestStatus === 'requested'
                ? $t('refundRequests.status.requested')
                : refundRequestStatus
            }}
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

        <div
          class="grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]"
          data-testid="shipping-phase-layout"
        >
          <ol
            class="flex flex-col gap-2 rounded-xl border border-default bg-elevated px-4 py-3"
            data-testid="shipping-phase-timeline"
          >
            <li
              v-for="row in phaseRows"
              :key="row.key"
              class="text-sm"
              :class="row.current
                ? 'font-semibold text-highlighted'
                : row.done
                  ? 'text-muted'
                  : 'text-muted/70'"
              :data-testid="`shipping-phase-${row.key}`"
              :data-current="row.current ? 'true' : 'false'"
            >
              {{ row.label }}
            </li>
          </ol>

          <div class="flex flex-col gap-4">
            <div
              class="rounded-xl border border-default bg-elevated px-4 py-3 text-sm"
              data-testid="shipping-side-fields"
            >
              <dl class="grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)]">
                <dt class="text-muted">
                  {{ $t('shipping.columns.recipient') }}
                </dt>
                <dd class="text-highlighted">
                  {{ recipientName || $t('status.na') }}
                </dd>
                <dt class="text-muted">
                  {{ $t('shipping.columns.item') }}
                </dt>
                <dd class="text-highlighted">
                  {{ packagePlanName }}
                </dd>
                <template v-if="refundRequestStatus">
                  <dt class="text-muted">
                    {{ $t('shipping.refundRequestLabel') }}
                  </dt>
                  <dd
                    class="text-highlighted"
                    data-testid="shipping-refund-side"
                  >
                    {{
                      refundRequestStatus === 'requested'
                        ? $t('refundRequests.status.requested')
                        : refundRequestStatus
                    }}
                  </dd>
                </template>
              </dl>
            </div>

            <div
              v-if="showAdvanceToPicking"
              class="flex flex-col gap-2 rounded-xl border border-default bg-elevated px-4 py-3"
              data-testid="shipping-advance-picking"
            >
              <UTooltip
                :text="pickingBlockedByRefund ? $t('shipping.refundBlocksPicking') : undefined"
                :disabled="!pickingBlockedByRefund"
              >
                <span class="inline-flex w-fit">
                  <UButton
                    color="primary"
                    :loading="advancePending"
                    :disabled="pickingBlockedByRefund || advancePending || !orderIdForShipment"
                    data-testid="shipping-advance-to-picking"
                    @click="advanceToPicking"
                  >
                    {{ $t('shipping.advanceToPicking') }}
                  </UButton>
                </span>
              </UTooltip>
              <p
                v-if="pickingBlockedByRefund || advanceError"
                class="text-sm text-muted"
                data-testid="shipping-refund-blocks-picking"
              >
                {{ advanceError || $t('shipping.refundBlocksPicking') }}
              </p>
            </div>
          </div>
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
          <AdminTable
            v-else
            compact
          >
            <template #head>
              <tr>
                <th>{{ $t('shipping.packageColumns.name') }}</th>
                <th class="text-right">
                  {{ $t('shipping.packageColumns.dose') }}
                </th>
              </tr>
            </template>
            <tr
              v-for="(row, index) in components"
              :key="componentKey(row, index)"
            >
              <td>{{ componentName(row) }}</td>
              <td class="text-right tabular-nums">
                {{ doseOf(row) }}
              </td>
            </tr>
          </AdminTable>
        </section>

        <section
          v-if="bottleAddons.length"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
          data-testid="shipping-bottle-addons"
        >
          <div class="border-b border-default px-4 py-3">
            <h2 class="text-base font-semibold text-highlighted">
              {{ $t('shipping.sections.bottleAddons') }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{ $t('shipping.sections.bottleAddonsHint') }}
            </p>
          </div>
          <AdminTable compact>
            <template #head>
              <tr>
                <th>{{ $t('shipping.bottleAddonColumns.name') }}</th>
                <th>{{ $t('shipping.bottleAddonColumns.sku') }}</th>
                <th class="text-right">
                  {{ $t('shipping.bottleAddonColumns.bottles') }}
                </th>
              </tr>
            </template>
            <tr
              v-for="(row, index) in bottleAddons"
              :key="bottleAddonKey(row, index)"
              data-testid="shipping-bottle-addon-line"
            >
              <td>
                <span class="inline-flex flex-wrap items-center gap-2">
                  {{ row.sellable_item_name || $t('status.na') }}
                  <UBadge
                    size="sm"
                    color="info"
                    variant="soft"
                  >
                    {{ $t('orders.bottleAddonBadge') }}
                  </UBadge>
                </span>
              </td>
              <td class="font-mono text-sm text-muted">
                {{ row.sellable_item_sku || $t('status.na') }}
              </td>
              <td class="text-right tabular-nums font-medium text-highlighted">
                {{ row.qty }}
              </td>
            </tr>
          </AdminTable>
        </section>
      </template>
    </div>
  </PageHeader>
</template>
