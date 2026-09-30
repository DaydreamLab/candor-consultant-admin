<script setup lang="ts">
import { AdminApiError, adminGetOrder, adminListOrderMessages } from '~/utils/admin-api'
import { money } from '~/utils/format'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'

type FieldRow = { key: string, label: string, value: string, money?: boolean }

const TIME_KEYS = ['created_at', 'sent_at', 'timestamp', 'time']
const CUSTOMER_ROLES = new Set(['user', 'customer', 'client'])

const config = useRuntimeConfig()
const route = useRoute()
const { t, locale } = useI18n()
const orderLabel = useState<string | null>('candor-order-detail-label', () => null)

const orderId = computed(() => String(route.params.id ?? ''))
const title = computed(() => orderLabel.value || orderId.value)

const order = ref<Record<string, unknown> | null>(null)
const messages = ref<Record<string, unknown>[]>([])
const orderPending = ref(true)
const messagesPending = ref(true)
const orderError = ref('')
const messagesError = ref('')

const summaryFields = computed(() => summaryOf(order.value))
const recipientFields = computed(() => recipientOf(order.value))
const packageInfo = computed(() => packageOf(order.value))
const packageComponents = computed(() => packageInfo.value?.components ?? [])
const labLines = computed(() => labLinesOf(order.value))
const payments = computed(() => recordsOf(order.value?.payments))
const shipment = computed(() => recordOf(order.value?.shipment))
const daySupplies = computed(() => recordsOf(order.value?.day_supplies))
const vouchers = computed(() => recordsOf(order.value?.vouchers))
const techFields = computed(() => techOf(order.value, packageInfo.value?.raw ?? null))
const chatMessages = computed(() => oldestFirst(messages.value).map(toChatMessage))

if (import.meta.client) {
  watch(orderId, (id) => {
    void load(id)
  }, { immediate: true })
}

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/orders/')) {
    orderLabel.value = null
  }
})

async function load(id: string) {
  orderLabel.value = null
  order.value = null
  messages.value = []
  orderError.value = ''
  messagesError.value = ''

  const token = readOperatorToken()
  if (!token || !id) {
    orderPending.value = false
    messagesPending.value = false
    orderError.value = t('orders.detailFailed')
    messagesError.value = t('orders.messagesFailed')
    return
  }

  orderPending.value = true
  messagesPending.value = true
  const [orderResult, messagesResult] = await Promise.allSettled([
    adminGetOrder(config.public.apiBase, token, id),
    adminListOrderMessages(config.public.apiBase, token, id)
  ])
  if (orderId.value !== id) {
    return
  }

  if (orderResult.status === 'fulfilled') {
    order.value = orderResult.value
    orderError.value = ''
    const orderNo = orderResult.value.order_no
    orderLabel.value = typeof orderNo === 'string' && orderNo.trim() ? orderNo.trim() : null
  } else {
    order.value = null
    orderError.value = failText(orderResult.reason, t('orders.detailFailed'))
  }
  orderPending.value = false

  if (messagesResult.status === 'fulfilled') {
    messages.value = messagesResult.value
    messagesError.value = ''
  } else {
    messages.value = []
    messagesError.value = failText(messagesResult.reason, t('orders.messagesFailed'))
  }
  messagesPending.value = false
}

function failText(error: unknown, fallback: string) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || fallback
}

function summaryOf(data: Record<string, unknown> | null): FieldRow[] {
  if (!data) {
    return []
  }
  const rows: FieldRow[] = []
  pushMapped(rows, 'status', data.status, value => mappedLabel('orderStatus', value))
  pushMapped(rows, 'payment_status', data.payment_status, value => mappedLabel('paymentStatus', value))
  pushMoney(rows, 'amount_total', data.amount_total)
  pushText(rows, 'package_plan_name', data.package_plan_name)
  pushTime(rows, 'created_at', data.created_at)
  const period = periodText(data.period_start, data.period_end)
  if (period) {
    rows.push({ key: 'period', label: t('orders.fields.period'), value: period })
  }
  pushTime(rows, 'paid_at', data.paid_at)
  pushMoney(rows, 'paid_amount', data.paid_amount)
  if (data.status === 'confirmed' || isPresentScalar(data.confirmed_at)) {
    pushTime(rows, 'confirmed_at', data.confirmed_at)
  }
  if (data.status === 'cancelled' || isPresentScalar(data.cancelled_at) || isPresentScalar(data.cancel_reason)) {
    pushTime(rows, 'cancelled_at', data.cancelled_at)
    pushText(rows, 'cancel_reason', data.cancel_reason)
  }
  return rows
}

function recipientOf(data: Record<string, unknown> | null): FieldRow[] {
  if (!data) {
    return []
  }
  const recipient = recordOf(data.recipient)
  const rows: FieldRow[] = []
  pushText(rows, 'recipient_name', recipient?.name ?? data.recipient_name)
  pushText(rows, 'recipient_phone', recipient?.phone ?? data.recipient_phone)
  pushText(rows, 'recipient_address', recipient?.address ?? data.recipient_address)
  pushText(rows, 'recipient_email', recipient?.email ?? data.recipient_email)
  pushMapped(rows, 'invoice_type', data.invoice_type, value => mappedLabel('invoiceType', value))
  pushText(rows, 'invoice_carrier', data.invoice_carrier)
  return rows
}

function packageOf(data: Record<string, unknown> | null) {
  const pkg = recordOf(data?.package)
  if (!pkg) {
    return null
  }
  const meta: FieldRow[] = []
  pushMoney(meta, 'package_plan_price', pkg.package_plan_price)
  pushText(meta, 'period_days', pkg.period_days)
  pushMoney(meta, 'used_amount', pkg.used_amount)
  pushMoney(meta, 'remaining', pkg.remaining)
  const components = recordsOf(pkg.components)
  return { raw: pkg, meta, components }
}

function labLinesOf(data: Record<string, unknown> | null) {
  return recordsOf(data?.lines).filter(row => row.kind === 'lab_service')
}

function techOf(data: Record<string, unknown> | null, pkg: Record<string, unknown> | null): FieldRow[] {
  if (!data) {
    return []
  }
  const rows: FieldRow[] = []
  pushText(rows, 'id', data.id)
  pushText(rows, 'user_id', data.user_id)
  pushText(rows, 'conversation_id', data.conversation_id)
  pushText(rows, 'renewal_of_order_id', data.renewal_of_order_id)
  pushText(rows, 'report_id', data.report_id)
  pushText(rows, 'recommendation_run_id', data.recommendation_run_id)
  pushTime(rows, 'updated_at', data.updated_at)
  pushText(rows, 'package_id', pkg?.id)
  pushText(rows, 'composition_hash', pkg?.composition_hash)
  return rows
}

function pushText(rows: FieldRow[], key: string, value: unknown) {
  if (!isPresentScalar(value)) {
    return
  }
  rows.push({ key, label: t(`orders.fields.${key}`), value: textOf(value) })
}

function pushMoney(rows: FieldRow[], key: string, value: unknown) {
  if (!isPresentScalar(value)) {
    return
  }
  rows.push({ key, label: t(`orders.fields.${key}`), value: amountText(value), money: true })
}

function pushTime(rows: FieldRow[], key: string, value: unknown) {
  if (!isPresentScalar(value)) {
    return
  }
  rows.push({ key, label: t(`orders.fields.${key}`), value: timeText(value) })
}

function pushMapped(rows: FieldRow[], key: string, value: unknown, map: (value: string) => string) {
  if (typeof value !== 'string' || !value.trim()) {
    return
  }
  rows.push({ key, label: t(`orders.fields.${key}`), value: map(value.trim()) })
}

function periodText(start: unknown, end: unknown) {
  const startText = isPresentScalar(start) ? timeText(start) : ''
  const endText = isPresentScalar(end) ? timeText(end) : ''
  if (startText && endText) {
    return `${startText} – ${endText}`
  }
  return startText || endText
}

function mappedLabel(group: string, value: string) {
  const key = `orders.${group}.${value}`
  const translated = t(key)
  return translated === key ? value : translated
}

function paymentFields(row: Record<string, unknown>): FieldRow[] {
  const rows: FieldRow[] = []
  pushMapped(rows, 'method', row.method, value => mappedLabel('paymentMethod', value))
  pushMapped(rows, 'status', row.status, value => mappedLabel('paymentRecordStatus', value))
  pushMoney(rows, 'amount', row.amount)
  pushTime(rows, 'created_at', row.created_at)
  pushTime(rows, 'settled_at', row.settled_at)
  pushTime(rows, 'expires_at', row.expires_at)
  pushText(rows, 'provider_txn_id', row.provider_txn_id)
  pushText(rows, 'atm_bank_code', row.atm_bank_code)
  pushText(rows, 'atm_account_no', row.atm_account_no)
  return rows
}

function shipmentFields(row: Record<string, unknown>): FieldRow[] {
  const rows: FieldRow[] = []
  pushMapped(rows, 'status', row.status, value => mappedLabel('shipmentStatus', value))
  pushText(rows, 'carrier', row.carrier)
  pushText(rows, 'tracking_no', row.tracking_no)
  pushTime(rows, 'picked_at', row.picked_at)
  pushTime(rows, 'shipped_at', row.shipped_at)
  pushTime(rows, 'arrived_at', row.arrived_at)
  pushText(rows, 'note', row.note)
  return rows
}

function paymentKey(row: Record<string, unknown>, index: number) {
  return scalarId(row.id) || `payment-${index}`
}

function componentKey(row: Record<string, unknown>, index: number) {
  return scalarId(row.id) || `component-${index}`
}

function labKey(row: Record<string, unknown>, index: number) {
  return scalarId(row.id) || `lab-${index}`
}

function daySupplyKey(row: Record<string, unknown>, index: number) {
  return scalarId(row.id) || `day-supply-${index}`
}

function voucherKey(row: Record<string, unknown>, index: number) {
  return scalarId(row.id) || `voucher-${index}`
}

function scalarId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function labName(row: Record<string, unknown>) {
  return textOf(row.lab_service_name)
}

function labPrice(row: Record<string, unknown>) {
  return amountText(row.lab_service_price ?? row.amount)
}

function componentName(row: Record<string, unknown>) {
  return textOf(row.sellable_item_name)
}

function daySupplyName(row: Record<string, unknown>) {
  return textOf(row.sellable_item_name)
}

function voucherName(row: Record<string, unknown>) {
  return textOf(row.lab_service_name)
}

function voucherStatus(row: Record<string, unknown>) {
  return typeof row.status === 'string' ? mappedLabel('voucherStatus', row.status) : t('status.na')
}

function voucherCode(row: Record<string, unknown>) {
  return row.status === 'issued' && isPresentScalar(row.code) ? textOf(row.code) : t('status.na')
}

function oldestFirst(rows: Record<string, unknown>[]) {
  const times = rows.map(messageTime)
  if (times.some(time => time === null)) {
    return rows
  }
  return rows
    .map((row, index) => ({ row, time: times[index] ?? 0 }))
    .sort((left, right) => left.time - right.time)
    .map(item => item.row)
}

function toChatMessage(row: Record<string, unknown>, index: number) {
  const speakerRole = roleOf(row)
  const customer = CUSTOMER_ROLES.has(speakerRole.toLowerCase())
  const content = contentOf(row)
  return {
    id: messageId(row, index),
    role: customer ? 'user' as const : 'assistant' as const,
    side: customer ? 'right' as const : 'left' as const,
    variant: customer ? 'soft' as const : 'outline' as const,
    speaker: speakerLabel(speakerRole),
    content,
    time: messageTimeText(row),
    parts: [{ type: 'text' as const, text: content }]
  }
}

function roleOf(row: Record<string, unknown>) {
  for (const key of ['role', 'sender', 'author']) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function contentOf(row: Record<string, unknown>) {
  if ('content' in row) {
    return typeof row.content === 'string' ? row.content : ''
  }
  for (const key of ['body', 'text', 'message']) {
    const value = row[key]
    if (typeof value === 'string') {
      return value
    }
  }
  return ''
}

function messageId(row: Record<string, unknown>, index: number) {
  return scalarId(row.id) || `message-${index}`
}

function messageTime(row: Record<string, unknown>) {
  for (const key of TIME_KEYS) {
    const value = row[key]
    if (typeof value !== 'string' || !value.trim()) {
      continue
    }
    const time = Date.parse(value)
    if (!Number.isNaN(time)) {
      return time
    }
  }
  return null
}

function messageTimeText(row: Record<string, unknown>) {
  for (const key of TIME_KEYS) {
    if (isPresentScalar(row[key])) {
      return timeText(row[key])
    }
  }
  return ''
}

function speakerLabel(role: string) {
  const key = role.toLowerCase()
  if (key === 'user') {
    return t('orders.speakers.user')
  }
  if (key === 'customer' || key === 'client') {
    return t('orders.speakers.customer')
  }
  if (key === 'assistant') {
    return t('orders.speakers.assistant')
  }
  return role || t('status.na')
}

function amountText(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return money(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return money(Number(value))
  }
  return textOf(value)
}

function timeText(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return textOf(value)
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

function textOf(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? t('status.yes') : t('status.no')
  }
  return t('status.na')
}

function isPresentScalar(value: unknown) {
  if (typeof value === 'string') {
    return Boolean(value.trim())
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  return typeof value === 'boolean'
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function recordsOf(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function bubbleUi(side: 'left' | 'right') {
  return {
    container: side === 'left' ? 'max-w-[75%] pb-3' : 'pb-3',
    content: 'space-y-1'
  }
}
</script>

<template>
  <PageHeader
    :title="title"
    plain
  >
    <div class="flex flex-col gap-6">
      <p
        v-if="orderError"
        class="text-sm text-error"
      >
        {{ orderError }}
      </p>
      <p
        v-else-if="orderPending"
        class="text-sm text-muted"
      >
        {{ $t('orders.loading') }}
      </p>
      <template v-else>
        <section
          v-if="summaryFields.length"
          class="overflow-hidden rounded-xl border border-default"
        >
          <h2 class="border-b border-default bg-elevated px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.summary') }}
          </h2>
          <dl class="grid gap-px bg-default sm:grid-cols-2">
            <div
              v-for="field in summaryFields"
              :key="field.key"
              class="bg-elevated px-4 py-3.5"
            >
              <dt class="text-sm text-muted">
                {{ field.label }}
              </dt>
              <dd
                class="mt-1 text-sm font-medium break-all text-highlighted"
                :class="field.money ? 'tabular-money' : ''"
              >
                {{ field.value }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          v-if="recipientFields.length"
          class="overflow-hidden rounded-xl border border-default"
        >
          <h2 class="border-b border-default bg-elevated px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.recipient') }}
          </h2>
          <dl class="grid gap-px bg-default sm:grid-cols-2">
            <div
              v-for="field in recipientFields"
              :key="field.key"
              class="bg-elevated px-4 py-3.5"
            >
              <dt class="text-sm text-muted">
                {{ field.label }}
              </dt>
              <dd class="mt-1 text-sm font-medium break-all text-highlighted">
                {{ field.value }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          v-if="packageInfo"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
        >
          <div class="border-b border-default px-4 py-3">
            <h2 class="text-base font-semibold text-highlighted">
              {{ $t('orders.sections.package') }}
            </h2>
            <p
              v-if="packageInfo.meta.length"
              class="mt-1 text-sm text-muted"
            >
              <span
                v-for="(field, index) in packageInfo.meta"
                :key="field.key"
              >
                <template v-if="index > 0"> · </template>
                {{ field.label }} {{ field.value }}
              </span>
            </p>
          </div>
          <div
            v-if="packageComponents.length"
            class="overflow-x-auto"
          >
            <table class="w-full text-left text-sm">
              <thead class="border-b border-default bg-muted/40 text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.name') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.dailyDose') }}
                  </th>
                  <th class="px-4 py-3 text-right font-medium">
                    {{ $t('orders.lineColumns.unitPrice') }}
                  </th>
                  <th class="px-4 py-3 text-right font-medium">
                    {{ $t('orders.lineColumns.monthlyCost') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in packageComponents"
                  :key="componentKey(row, index)"
                  class="border-b border-default last:border-0"
                >
                  <td class="px-4 py-3 text-highlighted">
                    {{ componentName(row) }}
                  </td>
                  <td class="px-4 py-3 text-highlighted">
                    {{ textOf(row.daily_dose) }}
                  </td>
                  <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
                    {{ amountText(row.unit_price) }}
                  </td>
                  <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
                    {{ amountText(row.monthly_cost) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="labLines.length"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
        >
          <h2 class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.labLines') }}
          </h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-default bg-muted/40 text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.name') }}
                  </th>
                  <th class="px-4 py-3 text-right font-medium">
                    {{ $t('orders.lineColumns.price') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in labLines"
                  :key="labKey(row, index)"
                  class="border-b border-default last:border-0"
                >
                  <td class="px-4 py-3 text-highlighted">
                    {{ labName(row) }}
                  </td>
                  <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
                    {{ labPrice(row) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="payments.length"
          class="overflow-hidden rounded-xl border border-default"
        >
          <h2 class="border-b border-default bg-elevated px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.payments') }}
          </h2>
          <div class="divide-y divide-default">
            <dl
              v-for="(row, index) in payments"
              :key="paymentKey(row, index)"
              class="grid gap-px bg-default sm:grid-cols-2"
            >
              <div
                v-for="field in paymentFields(row)"
                :key="`${paymentKey(row, index)}-${field.key}`"
                class="bg-elevated px-4 py-3.5"
              >
                <dt class="text-sm text-muted">
                  {{ field.label }}
                </dt>
                <dd
                  class="mt-1 text-sm font-medium break-all text-highlighted"
                  :class="field.money ? 'tabular-money' : ''"
                >
                  {{ field.value }}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          v-if="shipment"
          class="overflow-hidden rounded-xl border border-default"
        >
          <h2 class="border-b border-default bg-elevated px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.shipment') }}
          </h2>
          <dl class="grid gap-px bg-default sm:grid-cols-2">
            <div
              v-for="field in shipmentFields(shipment)"
              :key="field.key"
              class="bg-elevated px-4 py-3.5"
            >
              <dt class="text-sm text-muted">
                {{ field.label }}
              </dt>
              <dd class="mt-1 text-sm font-medium break-all text-highlighted">
                {{ field.value }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          v-if="daySupplies.length"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
        >
          <h2 class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.daySupplies') }}
          </h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-default bg-muted/40 text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.name') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.days') }}
                  </th>
                  <th class="px-4 py-3 text-right font-medium">
                    {{ $t('orders.lineColumns.dailyPrice') }}
                  </th>
                  <th class="px-4 py-3 text-right font-medium">
                    {{ $t('orders.lineColumns.price') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in daySupplies"
                  :key="daySupplyKey(row, index)"
                  class="border-b border-default last:border-0"
                >
                  <td class="px-4 py-3 text-highlighted">
                    {{ daySupplyName(row) }}
                  </td>
                  <td class="px-4 py-3 text-highlighted">
                    {{ textOf(row.days) }}
                  </td>
                  <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
                    {{ amountText(row.daily_price) }}
                  </td>
                  <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
                    {{ amountText(row.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="vouchers.length"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
        >
          <h2 class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.vouchers') }}
          </h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-default bg-muted/40 text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.name') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.status') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ $t('orders.lineColumns.code') }}
                  </th>
                  <th class="px-4 py-3 text-right font-medium">
                    {{ $t('orders.lineColumns.price') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in vouchers"
                  :key="voucherKey(row, index)"
                  class="border-b border-default last:border-0"
                >
                  <td class="px-4 py-3 text-highlighted">
                    {{ voucherName(row) }}
                  </td>
                  <td class="px-4 py-3 text-highlighted">
                    {{ voucherStatus(row) }}
                  </td>
                  <td class="px-4 py-3 text-highlighted">
                    {{ voucherCode(row) }}
                  </td>
                  <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
                    {{ amountText(row.price) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details
          v-if="techFields.length"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
        >
          <summary class="cursor-pointer px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.tech') }}
          </summary>
          <dl class="grid gap-px border-t border-default bg-default sm:grid-cols-2">
            <div
              v-for="field in techFields"
              :key="field.key"
              class="bg-elevated px-4 py-3.5"
            >
              <dt class="text-sm text-muted">
                {{ field.label }}
              </dt>
              <dd class="mt-1 text-sm font-medium break-all text-highlighted">
                {{ field.value }}
              </dd>
            </div>
          </dl>
        </details>
      </template>

      <section class="overflow-hidden rounded-xl border border-default bg-elevated">
        <h2 class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
          {{ $t('orders.sections.messages') }}
        </h2>
        <p
          v-if="messagesError"
          class="px-4 py-3 text-sm text-error"
        >
          {{ messagesError }}
        </p>
        <p
          v-else-if="messagesPending"
          class="px-4 py-3 text-sm text-muted"
        >
          {{ $t('orders.loading') }}
        </p>
        <p
          v-else-if="!chatMessages.length"
          class="px-4 py-10 text-center text-base text-muted"
        >
          {{ $t('orders.messagesEmpty') }}
        </p>
        <UChatMessages
          v-else
          :auto-scroll="false"
          :should-scroll-to-bottom="false"
          class="px-3 py-4"
        >
          <UChatMessage
            v-for="message in chatMessages"
            :id="message.id"
            :key="message.id"
            :role="message.role"
            :side="message.side"
            :variant="message.variant"
            :parts="message.parts"
            :ui="bubbleUi(message.side)"
          >
            <template
              v-if="message.time"
              #header
            >
              <time class="text-xs text-muted">
                {{ message.time }}
              </time>
            </template>
            <template #content>
              <p class="text-sm font-medium">
                {{ message.speaker }}
              </p>
              <p
                v-if="message.content"
                class="text-sm whitespace-pre-wrap wrap-break-word"
              >
                {{ message.content }}
              </p>
            </template>
          </UChatMessage>
        </UChatMessages>
      </section>
    </div>
  </PageHeader>
</template>
