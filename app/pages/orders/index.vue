<script setup lang="ts">
import { AdminApiError, adminListOrders } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

type OrderColumn = 'number' | 'status' | 'createdAt' | 'summary' | 'amount'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const orders = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')

const columns = computed(() => {
  const keys = new Set(orders.value.flatMap(row => Object.keys(row)))
  const visible: { key: OrderColumn, alignEnd: boolean }[] = []
  if (keys.has('order_no')) {
    visible.push({ key: 'number', alignEnd: false })
  }
  if (keys.has('status')) {
    visible.push({ key: 'status', alignEnd: false })
  }
  if (keys.has('created_at')) {
    visible.push({ key: 'createdAt', alignEnd: false })
  }
  if (keys.has('recipient_name') || keys.has('package_plan_name')) {
    visible.push({ key: 'summary', alignEnd: false })
  }
  if (keys.has('amount_total')) {
    visible.push({ key: 'amount', alignEnd: true })
  }
  return visible
})

if (import.meta.client) {
  void load()
}

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
    orders.value = await adminListOrders(config.public.apiBase, token)
  } catch (error) {
    orders.value = []
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    errorMessage.value = message || t('orders.failed')
  } finally {
    pending.value = false
  }
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
      return textOf(row.status)
    case 'createdAt':
      return createdAtOf(row.created_at)
    case 'summary':
      return summaryOf(row)
    case 'amount':
      return amountOf(row.amount_total)
  }
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
    <p
      v-else-if="!orders.length"
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
  </PageHeader>
</template>
