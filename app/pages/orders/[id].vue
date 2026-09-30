<script setup lang="ts">
import { AdminApiError, adminGetOrder, adminGetOrderHealthReport, adminListOrderMessages } from '~/utils/admin-api'
import { money } from '~/utils/format'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'
import {
  displayResultValue,
  formatResultRef,
  resultGaugePct,
  resultStatusClass,
  type HealthReportResult,
  type ResultStatusClass
} from '~/utils/report-result-status'

type FieldRow = { key: string, label: string, value: string, money?: boolean }

const TIME_KEYS = ['created_at', 'sent_at', 'timestamp', 'time']
const CUSTOMER_ROLES = new Set(['user', 'customer', 'client'])
const TIMELINE_STEPS = ['created', 'confirmed', 'shipped', 'delivered'] as const
const TIMELINE_ICONS: Record<string, string> = {
  created: 'i-lucide-file-plus',
  confirmed: 'i-lucide-badge-check',
  shipped: 'i-lucide-truck',
  delivered: 'i-lucide-package-check',
  cancelled: 'i-lucide-x'
}

type TimelineState = 'done' | 'upcoming' | 'cancelled'

type TimelineStep = {
  key: string
  label: string
  time: string
  state: TimelineState
  reason: string
}

const config = useRuntimeConfig()
const route = useRoute()
const { t, locale } = useI18n()
const orderLabel = useState<string | null>('candor-order-detail-label', () => null)

const orderId = computed(() => String(route.params.id ?? ''))
const title = computed(() => orderLabel.value || orderId.value)

const order = ref<Record<string, unknown> | null>(null)
const messages = ref<Record<string, unknown>[]>([])
const reportResults = ref<HealthReportResult[]>([])
const orderPending = ref(true)
const messagesPending = ref(true)
const reportPending = ref(false)
const orderError = ref('')
const messagesError = ref('')
const reportError = ref('')
const reportOpen = ref(true)
let loadSeq = 0

const reportSectionVisible = computed(() => Boolean(scalarId(order.value?.report_id)))

const summaryFields = computed(() => summaryOf(order.value))
const recipientFields = computed(() => recipientOf(order.value))
const packageInfo = computed(() => packageOf(order.value))
const packageComponents = computed(() => packageInfo.value?.components ?? [])
const labLines = computed(() => labLinesOf(order.value))
const payments = computed(() => recordsOf(order.value?.payments))
const shipment = computed(() => recordOf(order.value?.shipment))
const timelineSteps = computed(() => timelineOf(order.value, shipment.value))
const daySupplies = computed(() => recordsOf(order.value?.day_supplies))
const vouchers = computed(() => recordsOf(order.value?.vouchers))
const techFields = computed(() => techOf(order.value, packageInfo.value?.raw ?? null))
const chatMessages = computed(() => oldestFirst(messages.value).map(toChatMessage))
const assistantMessage = computed(() => ({
  side: 'left' as const,
  variant: 'outline' as const,
  avatar: {
    icon: 'i-lucide-bot'
  },
  actions: [{
    label: t('orders.copyMessage'),
    icon: 'i-lucide-copy',
    onClick: onCopyMessage
  }],
  ui: {
    content: 'whitespace-pre-wrap'
  }
}))
const userMessage = computed(() => ({
  side: 'right' as const,
  variant: 'soft' as const,
  ui: {
    content: 'bg-accented whitespace-pre-wrap'
  }
}))

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
  const seq = ++loadSeq
  orderLabel.value = null
  order.value = null
  messages.value = []
  reportResults.value = []
  orderError.value = ''
  messagesError.value = ''
  reportError.value = ''
  reportPending.value = false
  reportOpen.value = true

  const token = readOperatorToken()
  if (!token || !id) {
    orderPending.value = false
    messagesPending.value = false
    reportPending.value = false
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
  if (seq !== loadSeq || orderId.value !== id) {
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

  if (!scalarId(order.value?.report_id)) {
    return
  }

  reportPending.value = true
  try {
    const report = await adminGetOrderHealthReport(config.public.apiBase, token, id)
    if (seq !== loadSeq || orderId.value !== id) {
      return
    }
    reportResults.value = healthReportResultsOf(report)
    reportError.value = ''
  } catch (error) {
    if (seq !== loadSeq || orderId.value !== id) {
      return
    }
    reportResults.value = []
    reportError.value = failText(error, t('orders.reportReading.failed'))
  } finally {
    if (seq === loadSeq) {
      reportPending.value = false
    }
  }
}

function failText(error: unknown, fallback: string) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || fallback
}

function healthReportResultsOf(data: Record<string, unknown>): HealthReportResult[] {
  const out: HealthReportResult[] = []
  for (const row of recordsOf(data.results)) {
    const id = scalarId(row.id)
    if (!id) {
      continue
    }
    out.push({
      id,
      biomarker_id: optionalString(row.biomarker_id),
      raw_name: optionalString(row.raw_name),
      raw_value: optionalString(row.raw_value),
      raw_unit: optionalString(row.raw_unit),
      value_numeric: optionalNumber(row.value_numeric),
      unit: optionalString(row.unit),
      ref_low: optionalNumber(row.ref_low),
      ref_high: optionalNumber(row.ref_high),
      borderline_low: optionalNumber(row.borderline_low),
      borderline_high: optionalNumber(row.borderline_high),
      critical_low: optionalNumber(row.critical_low),
      critical_high: optionalNumber(row.critical_high),
      confidence: optionalNumber(row.confidence),
      needs_review: typeof row.needs_review === 'boolean' ? row.needs_review : undefined,
      page: optionalNumber(row.page)
    })
  }
  return out
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

function resultStatusLabel(cls: ResultStatusClass) {
  if (cls === 'ok') {
    return t('orders.reportReading.optimal')
  }
  if (cls === 'warn') {
    return t('orders.reportReading.caution')
  }
  if (cls === 'alert') {
    return t('orders.reportReading.alert')
  }
  return t('orders.reportReading.pending')
}

function summaryOf(data: Record<string, unknown> | null): FieldRow[] {
  if (!data) {
    return []
  }
  const rows: FieldRow[] = []
  pushText(rows, 'order_no', data.order_no)
  pushMapped(rows, 'status', data.status, value => mappedLabel('orderStatus', value), 'order_status')
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

function pushMapped(rows: FieldRow[], key: string, value: unknown, map: (value: string) => string, labelKey = key) {
  if (typeof value !== 'string' || !value.trim()) {
    return
  }
  rows.push({ key, label: t(`orders.fields.${labelKey}`), value: map(value.trim()) })
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

function timelineOf(data: Record<string, unknown> | null, shipmentRow: Record<string, unknown> | null): TimelineStep[] {
  if (!data) {
    return []
  }
  const times: Record<(typeof TIMELINE_STEPS)[number], unknown> = {
    created: data.created_at,
    confirmed: data.confirmed_at,
    shipped: shipmentRow?.shipped_at,
    delivered: shipmentRow?.arrived_at
  }
  const status = typeof data.status === 'string' ? data.status : ''
  if (status === 'cancelled') {
    let reached = 0
    if (isPresentScalar(times.confirmed)) {
      reached = 1
    }
    if (isPresentScalar(times.shipped)) {
      reached = 2
    }
    if (isPresentScalar(times.delivered)) {
      reached = 3
    }
    const steps = TIMELINE_STEPS.slice(0, reached + 1).map(key => stepOf(key, times[key], 'done'))
    steps.push({
      key: 'cancelled',
      label: mappedLabel('orderStatus', 'cancelled'),
      time: isPresentScalar(data.cancelled_at) ? timeText(data.cancelled_at) : '',
      state: 'cancelled',
      reason: isPresentScalar(data.cancel_reason) ? textOf(data.cancel_reason) : ''
    })
    return steps
  }
  const currentIndex = TIMELINE_STEPS.indexOf(status as (typeof TIMELINE_STEPS)[number])
  const active = currentIndex >= 0 ? currentIndex : 0
  return TIMELINE_STEPS.map((key, index) => stepOf(key, times[key], index <= active ? 'done' : 'upcoming'))
}

function stepOf(key: (typeof TIMELINE_STEPS)[number], value: unknown, state: TimelineState): TimelineStep {
  return {
    key,
    label: mappedLabel('orderStatus', key),
    time: isPresentScalar(value) ? timeText(value) : '',
    state,
    reason: ''
  }
}

function timelineIcon(key: string) {
  return TIMELINE_ICONS[key] ?? ''
}

function timelineMarkerClass(state: TimelineState) {
  if (state === 'cancelled') {
    return 'bg-error text-white'
  }
  if (state === 'upcoming') {
    return 'border-2 border-muted bg-elevated'
  }
  return 'bg-primary text-white dark:text-brand-950'
}

function timelineConnectorClass(index: number) {
  const state = timelineSteps.value[index + 1]?.state ?? 'upcoming'
  return state === 'upcoming' ? 'border-muted' : 'border-primary'
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
  return {
    id: messageId(row, index),
    role: customer ? 'user' as const : 'assistant' as const,
    parts: [{ type: 'text' as const, text: contentOf(row) }],
    metadata: {
      time: messageTimeText(row)
    }
  }
}

function onCopyMessage(_event: MouseEvent, message: { parts?: Array<{ text?: string }> }) {
  const text = (message.parts ?? [])
    .map(part => part.text ?? '')
    .join('\n')
    .trim()
  if (!text) {
    return
  }
  void navigator.clipboard.writeText(text)
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
</script>

<template>
  <PageHeader
    class="flex flex-col"
    :title="title"
    plain
  >
    <div class="flex flex-col gap-6">
      <ol
        v-if="timelineSteps.length"
        class="flex shrink-0 items-start overflow-x-auto rounded-xl border border-default bg-elevated px-4 py-4"
      >
        <li
          v-for="(step, index) in timelineSteps"
          :key="step.key"
          class="relative flex w-28 shrink-0 flex-col items-center px-1 text-center sm:w-auto sm:min-w-28 sm:flex-1"
        >
          <div
            v-if="index < timelineSteps.length - 1"
            class="absolute top-3.5 left-1/2 w-full border-t"
            :class="timelineConnectorClass(index)"
          />
          <span
            class="relative z-10 flex size-7 items-center justify-center rounded-full"
            :class="timelineMarkerClass(step.state)"
          >
            <UIcon
              v-if="step.state !== 'upcoming'"
              :name="timelineIcon(step.key)"
              class="size-4"
            />
          </span>
          <span
            class="mt-2 text-sm font-medium"
            :class="step.state === 'upcoming' ? 'text-muted' : 'text-highlighted'"
          >
            {{ step.label }}
          </span>
          <time
            v-if="step.time"
            class="mt-0.5 text-xs text-muted"
          >
            {{ step.time }}
          </time>
          <p
            v-if="step.reason"
            class="mt-1 text-xs text-muted wrap-break-word"
          >
            {{ $t('orders.fields.cancel_reason') }}: {{ step.reason }}
          </p>
        </li>
      </ol>

      <section
        v-if="reportSectionVisible"
        class="flex shrink-0 flex-col overflow-hidden rounded-xl border border-default bg-elevated"
      >
        <button
          type="button"
          class="flex shrink-0 cursor-pointer items-center justify-between gap-3 bg-elevated px-4 py-3 text-left text-base font-semibold text-highlighted"
          :class="reportOpen ? 'border-b border-default' : ''"
          @click="reportOpen = !reportOpen"
        >
          <span>{{ $t('orders.sections.reportReading') }}</span>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 shrink-0 text-muted transition-transform"
            :class="reportOpen ? 'rotate-90' : ''"
          />
        </button>
        <div
          v-show="reportOpen"
          class="flex min-h-0 flex-col"
        >
          <p
            v-if="reportError"
            class="px-4 py-3 text-sm text-error"
          >
            {{ reportError }}
          </p>
          <p
            v-else-if="reportPending"
            class="px-4 py-3 text-sm text-muted"
          >
            {{ $t('orders.reportReading.loading') }}
          </p>
          <p
            v-else-if="!reportResults.length"
            class="px-4 py-3 text-sm text-muted"
          >
            {{ $t('orders.reportReading.empty') }}
          </p>
          <template v-else>
            <div class="shrink-0 border-b border-default bg-elevated px-4 py-2.5">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted">
                <span class="inline-flex items-center">
                  <i class="yr-dot ok" />{{ $t('orders.reportReading.optimal') }}
                </span>
                <span class="inline-flex items-center">
                  <i class="yr-dot warn" />{{ $t('orders.reportReading.caution') }}
                </span>
                <span class="inline-flex items-center">
                  <i class="yr-dot alert" />{{ $t('orders.reportReading.alert') }}
                </span>
                <span class="text-dimmed sm:ms-auto">{{ $t('orders.reportReading.colorHint') }}</span>
              </div>
            </div>
            <div class="h-56 min-h-0 overflow-y-auto bg-elevated px-4 py-3">
              <div class="overflow-x-auto rounded-lg border border-default bg-default">
                <table class="w-full min-w-[32rem] border-collapse text-sm">
                  <thead>
                    <tr class="bg-muted text-left text-xs font-semibold text-muted">
                      <th class="border-b border-dashed border-default px-2.5 py-2">
                        {{ $t('orders.reportReading.status') }}
                      </th>
                      <th class="border-b border-dashed border-default px-2.5 py-2">
                        {{ $t('orders.reportReading.item') }}
                      </th>
                      <th class="border-b border-dashed border-default px-2.5 py-2">
                        {{ $t('orders.reportReading.value') }}
                      </th>
                      <th class="border-b border-dashed border-default px-2.5 py-2">
                        {{ $t('orders.reportReading.unit') }}
                      </th>
                      <th class="border-b border-dashed border-default px-2.5 py-2">
                        {{ $t('orders.reportReading.refRange') }}
                      </th>
                      <th class="border-b border-dashed border-default px-2.5 py-2">
                        {{ $t('orders.reportReading.position') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in reportResults"
                      :key="row.id"
                      class="border-b border-dashed border-default last:border-0"
                    >
                      <td class="px-2.5 py-2.5 text-highlighted">
                        <i
                          class="yr-dot"
                          :class="resultStatusClass(row)"
                        />{{ resultStatusLabel(resultStatusClass(row)) }}
                      </td>
                      <td class="px-2.5 py-2.5 font-semibold text-highlighted">
                        {{ row.raw_name || row.biomarker_id || '—' }}
                      </td>
                      <td
                        class="px-2.5 py-2.5 text-base font-bold"
                        :class="`yr-val-${resultStatusClass(row)}`"
                      >
                        {{ displayResultValue(row) }}
                      </td>
                      <td class="px-2.5 py-2.5 text-muted">
                        {{ row.unit || row.raw_unit || '—' }}
                      </td>
                      <td class="px-2.5 py-2.5 text-xs text-muted">
                        {{ formatResultRef(row) }}
                      </td>
                      <td class="overflow-visible px-2.5 py-2.5">
                        <div
                          v-if="resultGaugePct(row) != null"
                          class="yr-gauge relative h-2 w-[4.5rem] overflow-visible rounded-full"
                        >
                          <div
                            class="yr-gauge-marker absolute top-[-3px] h-3.5 -translate-x-1/2 rounded-sm"
                            :style="{ left: `${resultGaugePct(row)}%` }"
                          />
                        </div>
                        <span
                          v-else
                          class="text-muted"
                        >—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>
      </section>

      <div class="grid items-start gap-6 lg:grid-cols-2 lg:items-stretch">
        <div
          :key="orderId"
          class="flex min-w-0 flex-col gap-6"
        >
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
            <details
              v-if="packageInfo"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="cursor-pointer list-none px-4 py-3 group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span class="flex items-center justify-between gap-3">
                  <span class="text-base font-semibold text-highlighted">
                    {{ $t('orders.sections.package') }}
                  </span>
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                  />
                </span>
                <span
                  v-if="packageInfo.meta.length"
                  class="mt-1 block text-sm font-normal text-muted"
                >
                  <span
                    v-for="(field, index) in packageInfo.meta"
                    :key="field.key"
                  >
                    <template v-if="index > 0"> · </template>
                    {{ field.label }} {{ field.value }}
                  </span>
                </span>
              </summary>
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
                      <th class="px-4 py-3 text-center font-medium">
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
                      <td class="px-4 py-3 text-center text-highlighted">
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
            </details>

            <details
              v-if="summaryFields.length"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 bg-elevated px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.summary') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
              <dl class="grid sm:grid-cols-2">
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
            </details>

            <details
              v-if="recipientFields.length"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 bg-elevated px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.recipient') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
              <dl class="grid sm:grid-cols-2">
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
            </details>

            <details
              v-if="labLines.length"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.labLines') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
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
            </details>

            <details
              v-if="payments.length"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 bg-elevated px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.payments') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
              <div class="divide-y divide-default">
                <dl
                  v-for="(row, index) in payments"
                  :key="paymentKey(row, index)"
                  class="grid sm:grid-cols-2"
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
            </details>

            <details
              v-if="shipment"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 bg-elevated px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.shipment') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
              <dl class="grid sm:grid-cols-2">
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
            </details>

            <details
              v-if="daySupplies.length"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.daySupplies') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
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
            </details>

            <details
              v-if="vouchers.length"
              open
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.vouchers') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
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
            </details>

            <details
              v-if="techFields.length"
              class="group shrink-0 overflow-hidden rounded-xl border border-default bg-elevated"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-highlighted group-open:border-b group-open:border-default [&::-webkit-details-marker]:hidden">
                <span>{{ $t('orders.sections.tech') }}</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                />
              </summary>
              <dl class="grid sm:grid-cols-2">
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
        </div>

        <section class="flex max-h-[50vh] min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-default bg-elevated lg:max-h-none">
          <div class="flex shrink-0 items-center border-b border-default bg-elevated px-4 py-3 text-base font-semibold text-highlighted">
            <span>{{ $t('orders.sections.messages') }}</span>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
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
              :messages="chatMessages"
              :assistant="assistantMessage"
              :user="userMessage"
              :auto-scroll="false"
              :should-scroll-to-bottom="false"
              class="py-4"
            >
              <template #header="{ metadata }">
                <time
                  v-if="metadata?.time"
                  class="text-xs text-muted"
                >
                  {{ metadata.time }}
                </time>
              </template>
            </UChatMessages>
          </div>
        </section>
      </div>
    </div>
  </PageHeader>
</template>

<style scoped>
.yr-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  border-radius: 999px;
}

.yr-dot.ok {
  background: var(--ui-success);
}

.yr-dot.warn {
  background: var(--ui-warning);
}

.yr-dot.alert {
  background: var(--ui-error);
}

.yr-dot.unknown {
  background: var(--ui-text-dimmed);
}

.yr-val-ok {
  color: var(--ui-success);
}

.yr-val-warn {
  color: var(--ui-warning);
}

.yr-val-alert {
  color: var(--ui-error);
}

.yr-val-unknown {
  color: var(--ui-text-muted);
}

.yr-gauge {
  background: linear-gradient(
    90deg,
    color-mix(in oklab, var(--ui-error) 85%, var(--ui-bg-elevated)) 0%,
    color-mix(in oklab, var(--ui-warning) 85%, var(--ui-bg-elevated)) 28%,
    color-mix(in oklab, var(--ui-success) 85%, var(--ui-bg-elevated)) 50%,
    color-mix(in oklab, var(--ui-warning) 85%, var(--ui-bg-elevated)) 72%,
    color-mix(in oklab, var(--ui-error) 85%, var(--ui-bg-elevated)) 100%
  );
}

.yr-gauge-marker {
  width: 3px;
  background: var(--ui-text-highlighted);
  box-shadow: 0 0 0 1px var(--ui-bg-elevated);
}
</style>
