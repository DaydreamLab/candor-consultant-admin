<script setup lang="ts">
import {
  AdminApiError,
  adminGetUser,
  adminGetUserHealthReport,
  adminListUserConversationMessages,
  adminListUserConversations,
  adminListUserHealthReports,
  adminListUserOrders
} from '~/utils/admin-api'
import { money } from '~/utils/format'
import { readOperatorToken } from '~/utils/operator-session'
import {
  displayResultValue,
  formatResultRef,
  resultGaugePct,
  resultStatusClass,
  type HealthReportResult,
  type ResultStatusClass
} from '~/utils/report-result-status'

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

const CUSTOMER_ROLES = new Set(['user', 'customer', 'client'])
const TIME_KEYS = ['created_at', 'sent_at', 'timestamp', 'time']

const config = useRuntimeConfig()
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const userLabel = useState<string | null>('candor-user-detail-label', () => null)

const userId = computed(() => String(route.params.id ?? ''))
const title = computed(() => userLabel.value || userId.value)

const user = ref<Record<string, unknown> | null>(null)
const orders = ref<Record<string, unknown>[]>([])
const conversations = ref<Record<string, unknown>[]>([])
const reports = ref<Record<string, unknown>[]>([])
const messages = ref<Record<string, unknown>[]>([])
const reportResults = ref<HealthReportResult[]>([])
const conversationUsage = ref<Record<string, unknown> | null>(null)
const reportUsage = ref<Record<string, unknown> | null>(null)

const userPending = ref(true)
const ordersPending = ref(true)
const conversationsPending = ref(true)
const reportsPending = ref(true)
const messagesPending = ref(false)
const reportPending = ref(false)

const userError = ref('')
const ordersError = ref('')
const conversationsError = ref('')
const reportsError = ref('')
const messagesError = ref('')
const reportError = ref('')

const selectedConversationId = ref('')
const selectedReportId = ref('')
let loadSeq = 0
let messagesSeq = 0
let reportSeq = 0

const summaryFields = computed(() => {
  const data = user.value
  if (!data) {
    return [] as { key: string, label: string, value: string }[]
  }
  return [
    { key: 'email', label: t('users.fields.email'), value: textOf(data.email) },
    { key: 'displayName', label: t('users.fields.displayName'), value: textOf(data.display_name) },
    { key: 'role', label: t('users.fields.role'), value: textOf(data.role) },
    { key: 'createdAt', label: t('users.fields.createdAt'), value: createdAtOf(data.created_at) },
    { key: 'orderCount', label: t('users.fields.orderCount'), value: countOf(data.order_count) },
    { key: 'reportCount', label: t('users.fields.reportCount'), value: countOf(data.report_count) },
    {
      key: 'anonymizedAt',
      label: t('users.fields.anonymizedAt'),
      value: typeof data.anonymized_at === 'string' && data.anonymized_at.trim()
        ? createdAtOf(data.anonymized_at)
        : t('users.anonymized.no')
    }
  ]
})

const chatMessages = computed(() => oldestFirst(messages.value).map(toChatMessage))
const assistantMessage = computed(() => ({
  side: 'left' as const,
  variant: 'outline' as const,
  avatar: { icon: 'i-lucide-bot' },
  ui: { content: 'whitespace-pre-wrap' }
}))
const userMessage = computed(() => ({
  side: 'right' as const,
  variant: 'soft' as const,
  ui: { content: 'bg-accented whitespace-pre-wrap' }
}))

if (import.meta.client) {
  watch(userId, (id) => {
    void load(id)
  }, { immediate: true })
}

onBeforeUnmount(() => {
  userLabel.value = null
})

async function load(id: string) {
  const seq = ++loadSeq
  selectedConversationId.value = ''
  selectedReportId.value = ''
  messages.value = []
  reportResults.value = []
  conversationUsage.value = null
  reportUsage.value = null
  messagesError.value = ''
  reportError.value = ''
  userLabel.value = null

  if (!id) {
    user.value = null
    orders.value = []
    conversations.value = []
    reports.value = []
    userError.value = t('users.notFound')
    userPending.value = false
    ordersPending.value = false
    conversationsPending.value = false
    reportsPending.value = false
    return
  }

  const token = readOperatorToken()
  if (!token) {
    user.value = null
    orders.value = []
    conversations.value = []
    reports.value = []
    userError.value = t('users.detailFailed')
    userPending.value = false
    ordersPending.value = false
    conversationsPending.value = false
    reportsPending.value = false
    return
  }

  userPending.value = true
  ordersPending.value = true
  conversationsPending.value = true
  reportsPending.value = true
  userError.value = ''
  ordersError.value = ''
  conversationsError.value = ''
  reportsError.value = ''

  const [userResult, ordersResult, conversationsResult, reportsResult] = await Promise.allSettled([
    adminGetUser(config.public.apiBase, token, id),
    adminListUserOrders(config.public.apiBase, token, id),
    adminListUserConversations(config.public.apiBase, token, id),
    adminListUserHealthReports(config.public.apiBase, token, id)
  ])

  if (seq !== loadSeq || userId.value !== id) {
    return
  }

  if (userResult.status === 'fulfilled') {
    user.value = userResult.value
    userError.value = ''
    userLabel.value = displayTitle(userResult.value)
  } else {
    user.value = null
    userError.value = failText(userResult.reason, t('users.detailFailed'))
  }
  userPending.value = false

  if (ordersResult.status === 'fulfilled') {
    orders.value = ordersResult.value
    ordersError.value = ''
  } else {
    orders.value = []
    ordersError.value = failText(ordersResult.reason, t('users.orders.failed'))
  }
  ordersPending.value = false

  if (conversationsResult.status === 'fulfilled') {
    conversations.value = conversationsResult.value
    conversationsError.value = ''
  } else {
    conversations.value = []
    conversationsError.value = failText(conversationsResult.reason, t('users.conversations.failed'))
  }
  conversationsPending.value = false

  if (reportsResult.status === 'fulfilled') {
    reports.value = reportsResult.value
    reportsError.value = ''
  } else {
    reports.value = []
    reportsError.value = failText(reportsResult.reason, t('users.reports.failed'))
  }
  reportsPending.value = false
}

async function openConversation(row: Record<string, unknown>) {
  const id = scalarId(row.id)
  if (!id || id === selectedConversationId.value) {
    return
  }
  selectedConversationId.value = id
  conversationUsage.value = isUsageRecord(row.llm_usage) ? row.llm_usage : null
  const seq = ++messagesSeq
  const token = readOperatorToken()
  if (!token) {
    messages.value = []
    messagesError.value = t('users.conversations.messagesFailed')
    return
  }
  messagesPending.value = true
  messagesError.value = ''
  try {
    const fetched = await adminListUserConversationMessages(
      config.public.apiBase,
      token,
      userId.value,
      id
    )
    if (seq !== messagesSeq) {
      return
    }
    messages.value = fetched.messages
    conversationUsage.value = fetched.llm_usage
  } catch (error) {
    if (seq !== messagesSeq) {
      return
    }
    messages.value = []
    messagesError.value = failText(error, t('users.conversations.messagesFailed'))
  } finally {
    if (seq === messagesSeq) {
      messagesPending.value = false
    }
  }
}

async function openReport(row: Record<string, unknown>) {
  const id = scalarId(row.id)
  if (!id || id === selectedReportId.value) {
    return
  }
  selectedReportId.value = id
  reportUsage.value = isUsageRecord(row.llm_usage) ? row.llm_usage : null
  const seq = ++reportSeq
  const token = readOperatorToken()
  if (!token) {
    reportResults.value = []
    reportError.value = t('orders.reportReading.failed')
    return
  }
  reportPending.value = true
  reportError.value = ''
  try {
    const report = await adminGetUserHealthReport(
      config.public.apiBase,
      token,
      userId.value,
      id
    )
    if (seq !== reportSeq) {
      return
    }
    reportResults.value = healthReportResultsOf(report)
    reportUsage.value = isUsageRecord(report.llm_usage) ? report.llm_usage : reportUsage.value
  } catch (error) {
    if (seq !== reportSeq) {
      return
    }
    reportResults.value = []
    reportError.value = failText(error, t('orders.reportReading.failed'))
  } finally {
    if (seq === reportSeq) {
      reportPending.value = false
    }
  }
}

function openOrder(row: Record<string, unknown>) {
  const id = scalarId(row.id)
  if (!id) {
    return
  }
  void navigateTo(localePath(`/orders/${encodeURIComponent(id)}`))
}

function displayTitle(data: Record<string, unknown>) {
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  if (email) {
    return email
  }
  const name = typeof data.display_name === 'string' ? data.display_name.trim() : ''
  return name || userId.value
}

function failText(error: unknown, fallback: string) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || fallback
}

function isUsageRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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

function recordsOf(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function scalarId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : ''
}

function textOf(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  return t('status.na')
}

function countOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return String(Number(value))
  }
  return '0'
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

function shortId(value: unknown) {
  const id = scalarId(value)
  if (!id) {
    return t('status.na')
  }
  return id.slice(0, 8)
}

function goalsOf(row: Record<string, unknown>) {
  if (!Array.isArray(row.goals) || row.goals.length === 0) {
    return t('status.na')
  }
  return row.goals.map(item => String(item)).join(', ')
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

function orderBadgeOf(row: Record<string, unknown>) {
  const raw = row.status
  const value = typeof raw === 'string' ? raw : ''
  const style = ORDER_BADGE[value] ?? { color: 'neutral' as const, variant: 'outline' as const }
  return {
    label: statusLabel('orderStatus', raw),
    color: style.color,
    variant: style.variant
  }
}

function paymentBadgeOf(row: Record<string, unknown>) {
  const raw = row.payment_status
  const value = typeof raw === 'string' ? raw : ''
  const style = PAYMENT_BADGE[value] ?? { color: 'neutral' as const, variant: 'outline' as const }
  return {
    label: statusLabel('paymentStatus', raw),
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

function oldestFirst(rows: Record<string, unknown>[]) {
  return [...rows].sort((a, b) => messageTime(a) - messageTime(b))
}

function toChatMessage(row: Record<string, unknown>, index: number) {
  return {
    id: scalarId(row.id) || `message-${index}`,
    role: isCustomerRole(row.role) ? 'user' : 'assistant',
    parts: [{ type: 'text', text: messageText(row) }],
    metadata: { time: messageTimeText(row) }
  }
}

function isCustomerRole(value: unknown) {
  return typeof value === 'string' && CUSTOMER_ROLES.has(value)
}

function messageText(row: Record<string, unknown>) {
  for (const key of ['content', 'body', 'text', 'message']) {
    if (typeof row[key] === 'string' && row[key].trim()) {
      return row[key]
    }
  }
  return ''
}

function messageTime(row: Record<string, unknown>) {
  for (const key of TIME_KEYS) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      const time = Date.parse(value)
      if (!Number.isNaN(time)) {
        return time
      }
    }
  }
  return 0
}

function messageTimeText(row: Record<string, unknown>) {
  for (const key of TIME_KEYS) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      return createdAtOf(value)
    }
  }
  return ''
}
</script>

<template>
  <PageHeader
    :title="title"
    plain
  >
    <div class="flex flex-col gap-6">
      <p
        v-if="userError"
        class="text-sm text-error"
      >
        {{ userError }}
      </p>
      <p
        v-else-if="userPending"
        class="text-sm text-muted"
      >
        {{ $t('users.loading') }}
      </p>
      <section
        v-else
        class="overflow-hidden rounded-xl border border-default bg-elevated"
      >
        <div class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
          {{ $t('users.sections.summary') }}
        </div>
        <dl class="grid sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="field in summaryFields"
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

      <section class="overflow-hidden rounded-xl border border-default bg-elevated">
        <div class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
          {{ $t('users.sections.orders') }}
        </div>
        <p
          v-if="ordersError"
          class="px-4 py-3 text-sm text-error"
        >
          {{ ordersError }}
        </p>
        <p
          v-else-if="ordersPending"
          class="px-4 py-3 text-sm text-muted"
        >
          {{ $t('users.loading') }}
        </p>
        <p
          v-else-if="!orders.length"
          class="px-4 py-10 text-center text-base text-muted"
        >
          {{ $t('users.orders.empty') }}
        </p>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr class="bg-muted text-left text-xs font-semibold text-muted">
                <th class="px-4 py-2.5">
                  {{ $t('orders.columns.number') }}
                </th>
                <th class="px-4 py-2.5">
                  {{ $t('orders.columns.createdAt') }}
                </th>
                <th class="px-4 py-2.5">
                  {{ $t('orders.columns.status') }}
                </th>
                <th class="px-4 py-2.5">
                  {{ $t('orders.columns.item') }}
                </th>
                <th class="px-4 py-2.5 text-right">
                  {{ $t('orders.columns.amount') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in orders"
                :key="scalarId(row.id)"
                class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
                @click="openOrder(row)"
              >
                <td class="px-4 py-3 font-medium text-highlighted">
                  {{ textOf(row.order_no) }}
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ createdAtOf(row.created_at) }}
                </td>
                <td class="px-4 py-3">
                  <UBadge
                    size="sm"
                    v-bind="orderBadgeOf(row)"
                  />
                </td>
                <td class="truncate px-4 py-3 text-highlighted">
                  {{ textOf(row.package_plan_name) }}
                </td>
                <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
                  <span class="inline-flex items-center justify-end gap-2">
                    <UBadge
                      size="sm"
                      v-bind="paymentBadgeOf(row)"
                    />
                    {{ amountOf(row.amount_total) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid items-start gap-6 lg:grid-cols-2">
        <section class="overflow-hidden rounded-xl border border-default bg-elevated">
          <div class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('users.sections.conversations') }}
          </div>
          <p
            v-if="conversationsError"
            class="px-4 py-3 text-sm text-error"
          >
            {{ conversationsError }}
          </p>
          <p
            v-else-if="conversationsPending"
            class="px-4 py-3 text-sm text-muted"
          >
            {{ $t('users.loading') }}
          </p>
          <p
            v-else-if="!conversations.length"
            class="px-4 py-10 text-center text-base text-muted"
          >
            {{ $t('users.conversations.empty') }}
          </p>
          <template v-else>
            <p class="border-b border-default px-4 py-2 text-xs text-muted">
              {{ $t('users.conversations.pick') }}
            </p>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr class="bg-muted text-left text-xs font-semibold text-muted">
                    <th class="px-4 py-2.5">
                      {{ $t('users.conversations.columns.id') }}
                    </th>
                    <th class="px-4 py-2.5">
                      {{ $t('users.conversations.columns.goals') }}
                    </th>
                    <th class="px-4 py-2.5">
                      {{ $t('users.conversations.columns.createdAt') }}
                    </th>
                    <th class="px-4 py-2.5">
                      {{ $t('llmUsage.cost') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in conversations"
                    :key="scalarId(row.id)"
                    class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
                    :class="selectedConversationId === scalarId(row.id) ? 'bg-muted/50' : ''"
                    @click="openConversation(row)"
                  >
                    <td class="px-4 py-3 font-medium text-highlighted">
                      {{ shortId(row.id) }}
                    </td>
                    <td class="truncate px-4 py-3 text-highlighted">
                      {{ goalsOf(row) }}
                    </td>
                    <td class="px-4 py-3 text-muted">
                      {{ createdAtOf(row.created_at) }}
                    </td>
                    <td class="px-4 py-3">
                      <LlmUsageSummary :usage="isUsageRecord(row.llm_usage) ? row.llm_usage : null" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <section class="flex max-h-[28rem] min-h-0 flex-col overflow-hidden rounded-xl border border-default bg-elevated">
          <div class="shrink-0 space-y-2 border-b border-default px-4 py-3">
            <div class="text-base font-semibold text-highlighted">
              {{ $t('users.sections.messages') }}
            </div>
            <LlmUsageSummary
              v-if="selectedConversationId"
              :usage="conversationUsage"
            />
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto">
            <p
              v-if="!selectedConversationId"
              class="px-4 py-10 text-center text-base text-muted"
            >
              {{ $t('users.conversations.pick') }}
            </p>
            <p
              v-else-if="messagesError"
              class="px-4 py-3 text-sm text-error"
            >
              {{ messagesError }}
            </p>
            <p
              v-else-if="messagesPending"
              class="px-4 py-3 text-sm text-muted"
            >
              {{ $t('users.loading') }}
            </p>
            <p
              v-else-if="!chatMessages.length"
              class="px-4 py-10 text-center text-base text-muted"
            >
              {{ $t('users.conversations.messagesEmpty') }}
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

      <div class="grid items-start gap-6 lg:grid-cols-2">
        <section class="overflow-hidden rounded-xl border border-default bg-elevated">
          <div class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
            {{ $t('users.sections.reports') }}
          </div>
          <p
            v-if="reportsError"
            class="px-4 py-3 text-sm text-error"
          >
            {{ reportsError }}
          </p>
          <p
            v-else-if="reportsPending"
            class="px-4 py-3 text-sm text-muted"
          >
            {{ $t('users.loading') }}
          </p>
          <p
            v-else-if="!reports.length"
            class="px-4 py-10 text-center text-base text-muted"
          >
            {{ $t('users.reports.empty') }}
          </p>
          <template v-else>
            <p class="border-b border-default px-4 py-2 text-xs text-muted">
              {{ $t('users.reports.pick') }}
            </p>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[24rem] border-collapse text-sm">
                <thead>
                  <tr class="bg-muted text-left text-xs font-semibold text-muted">
                    <th class="px-4 py-2.5">
                      {{ $t('users.reports.columns.id') }}
                    </th>
                    <th class="px-4 py-2.5">
                      {{ $t('users.reports.columns.status') }}
                    </th>
                    <th class="px-4 py-2.5">
                      {{ $t('users.reports.columns.createdAt') }}
                    </th>
                    <th class="px-4 py-2.5">
                      {{ $t('llmUsage.cost') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in reports"
                    :key="scalarId(row.id)"
                    class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
                    :class="selectedReportId === scalarId(row.id) ? 'bg-muted/50' : ''"
                    @click="openReport(row)"
                  >
                    <td class="px-4 py-3 font-medium text-highlighted">
                      {{ shortId(row.id) }}
                    </td>
                    <td class="px-4 py-3 text-highlighted">
                      {{ textOf(row.status) }}
                    </td>
                    <td class="px-4 py-3 text-muted">
                      {{ createdAtOf(row.created_at) }}
                    </td>
                    <td class="px-4 py-3">
                      <LlmUsageSummary :usage="isUsageRecord(row.llm_usage) ? row.llm_usage : null" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>

        <section class="overflow-hidden rounded-xl border border-default bg-elevated">
          <div class="space-y-2 border-b border-default px-4 py-3">
            <div class="text-base font-semibold text-highlighted">
              {{ $t('users.sections.reportReading') }}
            </div>
            <LlmUsageSummary
              v-if="selectedReportId"
              :usage="reportUsage"
            />
          </div>
          <p
            v-if="!selectedReportId"
            class="px-4 py-10 text-center text-base text-muted"
          >
            {{ $t('users.reports.pick') }}
          </p>
          <p
            v-else-if="reportError"
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
            <div class="border-b border-default bg-elevated px-4 py-2.5">
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
              </div>
            </div>
            <div class="max-h-72 overflow-y-auto bg-elevated px-4 py-3">
              <div class="overflow-x-auto rounded-lg border border-default bg-default">
                <table class="w-full min-w-[28rem] border-collapse text-sm">
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

.yr-val-ok {
  color: var(--ui-success);
}

.yr-val-warn {
  color: var(--ui-warning);
}

.yr-val-alert {
  color: var(--ui-error);
}

.yr-gauge {
  background: linear-gradient(90deg, var(--ui-error), var(--ui-warning), var(--ui-success), var(--ui-warning), var(--ui-error));
}

.yr-gauge-marker {
  width: 0.2rem;
  background: var(--ui-text-highlighted);
}
</style>
