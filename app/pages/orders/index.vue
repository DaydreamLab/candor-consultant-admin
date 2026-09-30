<script setup lang="ts">
import { AdminApiError, adminListOrders } from '~/utils/admin-api'
import { money } from '~/utils/format'
import { readOperatorToken } from '~/utils/operator-session'

type OrderColumn = 'number' | 'status' | 'payment' | 'createdAt' | 'summary' | 'amount'

const PAGE_SIZE = 50
const ORDER_STATUSES = ['created', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'expired'] as const

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const orders = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const offset = ref(0)

const filterStatus = ref('')
const filterPayment = ref('')
const filterQ = ref('')
const filterFrom = ref('')
const filterTo = ref('')
const debouncedQ = ref('')

let qTimer: ReturnType<typeof setTimeout> | null = null

const columns: { key: OrderColumn, alignEnd: boolean }[] = [
  { key: 'number', alignEnd: false },
  { key: 'status', alignEnd: false },
  { key: 'payment', alignEnd: false },
  { key: 'createdAt', alignEnd: false },
  { key: 'summary', alignEnd: false },
  { key: 'amount', alignEnd: true }
]

const statusOptions = computed(() => [
  { label: t('orders.filters.any'), value: '' },
  ...ORDER_STATUSES.map(value => ({
    label: t(`orders.orderStatus.${value}`),
    value
  }))
])

const paymentOptions = computed(() => [
  { label: t('orders.filters.any'), value: '' },
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
      status: filterStatus.value || undefined,
      payment_status: filterPayment.value || undefined,
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

function cellClass(key: OrderColumn) {
  if (key === 'amount') {
    return 'tabular-money text-right font-medium text-highlighted'
  }
  if (key === 'number') {
    return 'font-medium text-highlighted'
  }
  if (key === 'createdAt') {
    return 'text-muted'
  }
  return ''
}

function cellText(row: Record<string, unknown>, key: OrderColumn) {
  switch (key) {
    case 'number':
      return textOf(row.order_no)
    case 'status':
      return statusLabel('orderStatus', row.status)
    case 'payment':
      return statusLabel('paymentStatus', row.payment_status)
    case 'createdAt':
      return createdAtOf(row.created_at)
    case 'summary':
      return summaryOf(row)
    case 'amount':
      return amountOf(row.amount_total)
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
  return new Intl.DateTimeFormat(locale.value === 'en' ? 'en-US' : 'zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function summaryOf(row: Record<string, unknown>) {
  const parts = [row.recipient_name, row.package_plan_name]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map(value => value.trim())
  return parts.length ? parts.join(' · ') : t('status.na')
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
        >
          <template #head>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                :class="column.alignEnd ? 'text-right' : ''"
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
              :class="cellClass(column.key)"
            >
              {{ cellText(row, column.key) }}
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
