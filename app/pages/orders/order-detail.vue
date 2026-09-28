<script setup lang="ts">
import { AdminApiError, adminGetOrder, adminListOrderMessages } from '~/utils/admin-api'
import { money } from '~/utils/format'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'

definePageMeta({
  path: '/orders/:id'
})

type LineColumn = 'name' | 'qty' | 'price'

const NAME_KEYS = ['name', 'item_name', 'product_name', 'sellable_item_name', 'lab_service_name', 'package_plan_name', 'title']
const QTY_KEYS = ['quantity', 'qty']
const PRICE_KEYS = ['price', 'unit_price', 'amount', 'lab_service_price']
const TIME_KEYS = ['created_at', 'sent_at', 'timestamp', 'time']
const LEADING_FIELDS = ['status', 'created_at', 'amount_total', 'recipient_name', 'package_plan_name']
const SKIP_FIELDS = new Set(['id', 'order_no'])
const CUSTOMER_ROLES = new Set(['user', 'customer', 'client'])
const FIELD_LABELS = new Set([
  'status',
  'created_at',
  'amount_total',
  'recipient_name',
  'package_plan_name',
  'payment_status',
  'paid_at',
  'paid_amount',
  'period_start',
  'period_end',
  'confirmed_at',
  'cancelled_at',
  'cancel_reason',
  'invoice_type',
  'invoice_carrier',
  'conversation_id',
  'renewal_of_order_id',
  'report_id',
  'recommendation_run_id',
  'updated_at',
  'user_id'
])

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

const orderFields = computed(() => fieldsOf(order.value))
const orderLines = computed(() => linesOf(order.value))
const lineColumns = computed(() => columnsOf(orderLines.value))
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

function fieldsOf(data: Record<string, unknown> | null) {
  if (!data) {
    return []
  }
  const values = new Map<string, unknown>()
  for (const [key, value] of Object.entries(data)) {
    if (SKIP_FIELDS.has(key) || !isPresentScalar(value)) {
      continue
    }
    values.set(key, value)
  }
  if (!values.has('recipient_name')) {
    const recipient = data.recipient
    if (isRecord(recipient) && isPresentScalar(recipient.name)) {
      values.set('recipient_name', recipient.name)
    }
  }
  const leading = LEADING_FIELDS.filter(key => values.has(key))
  const rest = [...values.keys()].filter(key => !LEADING_FIELDS.includes(key))
  return [...leading, ...rest].map(key => ({
    key,
    label: fieldLabel(key),
    value: fieldValue(key, values.get(key)),
    money: isMoneyKey(key)
  }))
}

function linesOf(data: Record<string, unknown> | null) {
  if (!data) {
    return []
  }
  for (const key of ['order_lines', 'lines'] as const) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value.filter(isRecord)
    }
  }
  return []
}

function columnsOf(rows: Record<string, unknown>[]): LineColumn[] {
  const columns: LineColumn[] = []
  if (rows.some(row => lineValue(row, NAME_KEYS) !== undefined)) {
    columns.push('name')
  }
  if (rows.some(row => lineValue(row, QTY_KEYS) !== undefined)) {
    columns.push('qty')
  }
  if (rows.some(row => lineValue(row, PRICE_KEYS) !== undefined)) {
    columns.push('price')
  }
  return columns
}

function lineValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (isPresentScalar(row[key])) {
      return row[key]
    }
  }
  return undefined
}

function lineKey(row: Record<string, unknown>, index: number) {
  const id = row.id
  return typeof id === 'string' && id.trim() ? id : `line-${index}`
}

function lineCell(row: Record<string, unknown>, column: LineColumn) {
  if (column === 'name') {
    const value = lineValue(row, NAME_KEYS)
    return value === undefined ? t('status.na') : textOf(value)
  }
  if (column === 'qty') {
    const value = lineValue(row, QTY_KEYS)
    return value === undefined ? t('status.na') : textOf(value)
  }
  const value = lineValue(row, PRICE_KEYS)
  return value === undefined ? t('status.na') : amountText(value)
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
  const id = row.id
  return typeof id === 'string' && id.trim() ? id : `message-${index}`
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

function fieldLabel(key: string) {
  return FIELD_LABELS.has(key) ? t(`orders.fields.${key}`) : key
}

function fieldValue(key: string, value: unknown) {
  if (typeof value === 'boolean') {
    return value ? t('status.yes') : t('status.no')
  }
  if (isMoneyKey(key)) {
    return amountText(value)
  }
  if (isTimeKey(key)) {
    return timeText(value)
  }
  return textOf(value)
}

function isMoneyKey(key: string) {
  return key === 'amount' || key === 'amount_total' || key === 'price' || key.endsWith('_amount') || key.endsWith('_price')
}

function isTimeKey(key: string) {
  return key.endsWith('_at') || key === 'period_start' || key === 'period_end'
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
          v-if="orderFields.length"
          class="overflow-hidden rounded-xl border border-default"
        >
          <h2 class="border-b border-default bg-elevated px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.detail') }}
          </h2>
          <dl class="grid gap-px bg-default sm:grid-cols-2">
            <div
              v-for="field in orderFields"
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
          v-if="orderLines.length && lineColumns.length"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
        >
          <h2 class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('orders.sections.lines') }}
          </h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-default bg-muted/40 text-muted">
                <tr>
                  <th
                    v-for="column in lineColumns"
                    :key="column"
                    class="px-4 py-3 font-medium"
                    :class="column === 'price' ? 'text-right' : ''"
                  >
                    {{ $t(`orders.lineColumns.${column}`) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in orderLines"
                  :key="lineKey(row, index)"
                  class="border-b border-default last:border-0"
                >
                  <td
                    v-for="column in lineColumns"
                    :key="column"
                    class="px-4 py-3 text-highlighted"
                    :class="column === 'price' ? 'tabular-money text-right font-medium' : ''"
                  >
                    {{ lineCell(row, column) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
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
