<script setup lang="ts">
import { AdminApiError, adminListOrders } from '~/utils/admin-api'
import { money } from '~/utils/format'
import { readOperatorToken } from '~/utils/operator-session'

type OrderColumn = 'number' | 'createdAt' | 'recipient' | 'status' | 'item' | 'amount'
type BadgeColor = 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'
type BadgeVariant = 'outline' | 'soft'

const ORDER_BADGE: Record<string, { color: BadgeColor, variant: BadgeVariant }> = {
  created: { color: 'neutral', variant: 'outline' },
  confirmed: { color: 'primary', variant: 'soft' },
  shipped: { color: 'info', variant: 'soft' },
  delivered: { color: 'success', variant: 'soft' },
  cancelled: { color: 'error', variant: 'outline' }
}

const PAYMENT_BADGE: Record<string, { color: BadgeColor, variant: BadgeVariant }> = {
  unpaid: { color: 'warning', variant: 'outline' },
  pending: { color: 'warning', variant: 'soft' },
  paid: { color: 'success', variant: 'soft' },
  failed: { color: 'error', variant: 'soft' },
  expired: { color: 'error', variant: 'outline' }
}

const PAGE_SIZE = 50
const ORDER_STATUSES = ['created', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'expired'] as const

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const orders = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const offset = ref(0)

const FILTER_ANY = 'all'

const filterStatus = ref(FILTER_ANY)
const filterPayment = ref(FILTER_ANY)
const filterQ = ref('')
const filterFrom = ref('')
const filterTo = ref('')
const debouncedQ = ref('')

let qTimer: ReturnType<typeof setTimeout> | null = null

type ColumnAlign = 'left' | 'center' | 'right'

const columns: { key: OrderColumn, align: ColumnAlign, width?: string, truncate?: boolean }[] = [
  { key: 'number', align: 'left', width: 'w-[13.5rem]' },
  { key: 'createdAt', align: 'left', width: 'w-[9.5rem]' },
  { key: 'recipient', align: 'left', width: 'w-[8rem]', truncate: true },
  { key: 'status', align: 'center', width: 'w-[7rem]' },
  { key: 'item', align: 'left', truncate: true },
  { key: 'amount', align: 'right', width: 'w-[15rem]' }
]

const statusOptions = computed(() => [
  { label: t('orders.filters.any'), value: FILTER_ANY },
  ...ORDER_STATUSES.map(value => ({
    label: t(`orders.orderStatus.${value}`),
    value
  }))
])

const paymentOptions = computed(() => [
  { label: t('orders.filters.any'), value: FILTER_ANY },
  ...PAYMENT_STATUSES.map(value => ({
    label: t(`orders.paymentStatus.${value}`),
    value
  }))
])

const canPrev = computed(() => offset.value > 0)
const canNext = computed(() => orders.value.length >= PAGE_SIZE)

if (import.meta.client) {
  watch(filterQ, (value) => {
    if (qTimer) {
      clearTimeout(qTimer)
    }
    qTimer = setTimeout(() => {
      debouncedQ.value = value.trim()
    }, 300)
  })

  watch(
    [filterStatus, filterPayment, debouncedQ, filterFrom, filterTo],
    () => {
      offset.value = 0
      void load()
    },
    { immediate: true }
  )
}

onUnmounted(() => {
  if (qTimer) {
    clearTimeout(qTimer)
  }
})

async function load() {
  const token = readOperatorToken()
  if (!token) {
    orders.value = []
    errorMessage.value = t('orders.failed')
    pending.value = false
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    orders.value = await adminListOrders(config.public.apiBase, token, {
      status: filterStatus.value === FILTER_ANY ? undefined : filterStatus.value,
      payment_status: filterPayment.value === FILTER_ANY ? undefined : filterPayment.value,
      q: debouncedQ.value || undefined,
      from: dateBound(filterFrom.value, 'start'),
      to: dateBound(filterTo.value, 'end'),
      limit: PAGE_SIZE,
      offset: offset.value
    })
  } catch (error) {
    orders.value = []
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    errorMessage.value = message || t('orders.failed')
  } finally {
    pending.value = false
  }
}

function dateBound(value: string, edge: 'start' | 'end') {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  return edge === 'start' ? `${trimmed}T00:00:00` : `${trimmed}T23:59:59`
}

function prevPage() {
  if (!canPrev.value) {
    return
  }
  offset.value = Math.max(0, offset.value - PAGE_SIZE)
  void load()
}

function nextPage() {
  if (!canNext.value) {
    return
  }
  offset.value += PAGE_SIZE
  void load()
}

function orderId(row: Record<string, unknown>) {
  const id = row.id
  return typeof id === 'string' && id.trim() ? id : ''
}

function rowKey(row: Record<string, unknown>, index: number) {
  return orderId(row) || `order-${index}`
}

function openOrder(row: Record<string, unknown>) {
  const id = orderId(row)
  if (!id) {
    return
  }
  void navigateTo(localePath(`/orders/${encodeURIComponent(id)}`))
}

function columnLabel(key: OrderColumn) {
  return t(`orders.columns.${key}`)
}

function alignClass(align: ColumnAlign) {
  if (align === 'center') {
    return 'text-center'
  }
  if (align === 'right') {
    return 'text-right'
  }
  return ''
}

function cellClass(column: { key: OrderColumn, align: ColumnAlign, truncate?: boolean }) {
  const classes = [alignClass(column.align)]
  if (column.truncate) {
    classes.push('truncate')
  }
  if (column.key === 'amount') {
    classes.push('tabular-money font-medium text-highlighted')
  } else if (column.key === 'number') {
    classes.push('font-medium text-highlighted')
  } else if (column.key === 'createdAt') {
    classes.push('text-muted')
  }
  return classes.filter(Boolean).join(' ')
}

function isBadgeColumn(key: OrderColumn) {
  return key === 'status'
}

function cellText(row: Record<string, unknown>, key: OrderColumn) {
  switch (key) {
    case 'number':
      return textOf(row.order_no)
    case 'createdAt':
      return createdAtOf(row.created_at)
    case 'recipient':
      return textOf(row.recipient_name)
    case 'item':
      return textOf(row.package_plan_name)
    case 'amount':
      return amountOf(row.amount_total)
    case 'status':
      return ''
  }
}

function badgeOf(row: Record<string, unknown>) {
  const raw = row.status
  const value = typeof raw === 'string' ? raw : ''
  const style = ORDER_BADGE[value]
    ?? { color: 'neutral' as const, variant: 'outline' as const }
  return {
    label: statusLabel('orderStatus', raw),
    color: style.color,
    variant: style.variant
  }
}

function statusLabel(group: 'orderStatus' | 'paymentStatus', value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return t('status.na')
  }
  const key = `orders.${group}.${value}`
  const translated = t(key)
  return translated === key ? value : translated
}

function textOf(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return t('status.na')
}

function createdAtOf(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return t('status.na')
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}

function paymentBadgeOf(row: Record<string, unknown>) {
  const raw = row.payment_status
  const value = typeof raw === 'string' ? raw : ''
  const style = PAYMENT_BADGE[value]
    ?? { color: 'neutral' as const, variant: 'outline' as const }
  return {
    label: statusLabel('paymentStatus', raw),
    color: style.color,
    variant: style.variant
  }
}

function amountOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return money(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return money(Number(value))
  }
  return t('status.na')
}
</script>

<template>
  <PageHeader
    :title="$t('nav.orders')"
    plain
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="min-w-40 grow basis-40">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('orders.filters.q') }}
          </label>
          <UInput
            v-model="filterQ"
            icon="i-lucide-search"
            :placeholder="$t('orders.filters.qPlaceholder')"
            class="w-full"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('orders.filters.status') }}
          </label>
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            value-key="value"
            class="w-full"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('orders.filters.payment') }}
          </label>
          <USelect
            v-model="filterPayment"
            :items="paymentOptions"
            value-key="value"
            class="w-full"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('orders.filters.from') }}
          </label>
          <UInput
            v-model="filterFrom"
            type="date"
            class="w-full"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('orders.filters.to') }}
          </label>
          <UInput
            v-model="filterTo"
            type="date"
            class="w-full"
          />
        </div>
      </div>

      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="pending"
        class="text-sm text-muted"
      >
        {{ $t('orders.loading') }}
      </p>
      <template v-else>
        <p
          v-if="!orders.length"
          class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
        >
          {{ $t('orders.empty') }}
        </p>
        <AdminTable
          v-else
          compact
          fixed
        >
          <template #colgroup>
            <colgroup>
              <col
                v-for="column in columns"
                :key="column.key"
                :class="column.width"
              />
            </colgroup>
          </template>
          <template #head>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                :class="[column.width, alignClass(column.align)]"
              >
                {{ columnLabel(column.key) }}
              </th>
            </tr>
          </template>
          <tr
            v-for="(row, index) in orders"
            :key="rowKey(row, index)"
            class="border-b border-default last:border-0"
            :class="orderId(row) ? 'cursor-pointer hover:bg-muted/40' : ''"
            @click="openOrder(row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :class="cellClass(column)"
              :title="column.truncate ? cellText(row, column.key) : undefined"
            >
              <UBadge
                v-if="isBadgeColumn(column.key)"
                size="sm"
                v-bind="badgeOf(row)"
              />
              <span
                v-else-if="column.key === 'amount'"
                class="inline-flex items-center justify-end gap-2"
              >
                <UBadge
                  size="sm"
                  v-bind="paymentBadgeOf(row)"
                />
                {{ amountOf(row.amount_total) }}
              </span>
              <template v-else>
                {{ cellText(row, column.key) }}
              </template>
            </td>
          </tr>
        </AdminTable>
        <div
          v-if="canPrev || canNext"
          class="flex items-center justify-end gap-2"
        >
          <UButton
            color="neutral"
            variant="outline"
            :disabled="!canPrev || pending"
            @click="prevPage"
          >
            {{ $t('orders.pager.prev') }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            :disabled="!canNext || pending"
            @click="nextPage"
          >
            {{ $t('orders.pager.next') }}
          </UButton>
        </div>
      </template>
    </div>
  </PageHeader>
</template>
