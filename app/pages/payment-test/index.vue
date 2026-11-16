<script setup lang="ts">
import type {
  PaymentTestAuditLog,
  PaymentTestEnvironment,
  PaymentTestOrder,
  PaymentTestProviderResult
} from '~/types/payment-test'
import { AdminApiError } from '~/utils/admin-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import {
  describeOperatorApiError,
  redirectToLoginOnAuthFailure
} from '~/utils/operator-auth-failure'
import { hasAdminRole, operatorRoles } from '~/utils/operator-roles'
import { readOperatorToken } from '~/utils/operator-session'
import {
  adminCreatePaymentTest,
  adminIssuePaymentTestInvoice,
  adminListPaymentTestAuditLogs,
  adminListPaymentTests,
  adminRefundPaymentTest,
  adminVoidPaymentTestInvoice,
  isPaymentTestMockEnabled,
  openPaymentTestCheckout
} from '~/utils/payment-test-api'

const config = useRuntimeConfig()
const { t } = useI18n()
const session = useSessionStore()

const canManage = computed(() => hasAdminRole(operatorRoles(session.operator)))

const amount = ref(10)
const environment = ref<PaymentTestEnvironment>('sandbox')
const selectedId = ref('')
const orders = ref<PaymentTestOrder[]>([])
const auditLogs = ref<PaymentTestAuditLog[]>([])
const credentials = ref<{ newebpay: boolean, ezpay: boolean } | null>(null)
const lastProvider = ref<PaymentTestProviderResult | null>(null)
const pending = ref(true)
const actionPending = ref(false)
const errorMessage = ref('')

const scopeNote = computed(() => t('paymentTest.scopeNote'))

const environmentItems = computed(() => [
  { label: t('paymentTest.environment.sandbox'), value: 'sandbox' },
  { label: t('paymentTest.environment.production'), value: 'production' }
])

const selectedOrder = computed(() =>
  orders.value.find(row => row.id === selectedId.value) || null
)

const amountValid = computed(() =>
  Number.isInteger(amount.value) && amount.value >= 1 && amount.value <= 100000
)

if (import.meta.client) {
  void load()
}

function providerFromOrder(row: PaymentTestOrder | null | undefined): PaymentTestProviderResult | null {
  if (!row) {
    return null
  }
  if (!row.last_provider_status && !row.last_provider_message) {
    return null
  }
  return {
    status: row.last_provider_status || '',
    message: row.last_provider_message || '',
    payload: row.last_provider_payload || {}
  }
}

function syncProviderFromSelected() {
  lastProvider.value = providerFromOrder(selectedOrder.value)
}

async function load() {
  const token = readOperatorToken()
  if (!token || !canManage.value) {
    orders.value = []
    auditLogs.value = []
    lastProvider.value = null
    errorMessage.value = canManage.value
      ? t('paymentTest.failed')
      : t('paymentTest.errors.forbidden')
    pending.value = false
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    const [list, audits] = await Promise.all([
      adminListPaymentTests(config.public.apiBase, token, { limit: 20, offset: 0 }),
      adminListPaymentTestAuditLogs(config.public.apiBase, token, { limit: 20, offset: 0 })
    ])
    orders.value = list.payment_test_orders
    auditLogs.value = audits.audit_logs
    credentials.value = list.credentials_configured
    if (!selectedId.value && orders.value[0]) {
      selectedId.value = orders.value[0].id
    } else if (selectedId.value && !orders.value.some(row => row.id === selectedId.value)) {
      selectedId.value = orders.value[0]?.id || ''
    }
    syncProviderFromSelected()
  } catch (error) {
    if (await redirectToLoginOnAuthFailure(error)) {
      return
    }
    orders.value = []
    auditLogs.value = []
    lastProvider.value = null
    errorMessage.value = describeOperatorApiError(error, t)
      || (error instanceof AdminApiError && error.message.trim())
      || t('paymentTest.failed')
  } finally {
    pending.value = false
  }
}

function rememberProvider(provider: PaymentTestProviderResult) {
  lastProvider.value = provider
}

async function runAction(fn: (token: string) => Promise<void>) {
  const token = readOperatorToken()
  if (!token || !canManage.value || actionPending.value) {
    return
  }
  actionPending.value = true
  errorMessage.value = ''
  try {
    await fn(token)
    await load()
  } catch (error) {
    if (await redirectToLoginOnAuthFailure(error)) {
      return
    }
    errorMessage.value = describeOperatorApiError(error, t)
      || (error instanceof AdminApiError && error.message.trim())
      || t('paymentTest.actionFailed')
  } finally {
    actionPending.value = false
  }
}

async function startPay() {
  if (!amountValid.value) {
    errorMessage.value = t('paymentTest.errors.amount')
    return
  }
  await runAction(async (token) => {
    const result = await adminCreatePaymentTest(config.public.apiBase, token, {
      amount: amount.value,
      environment: environment.value
    })
    selectedId.value = result.payment_test_order.id
    rememberProvider(result.provider)
    if (!isPaymentTestMockEnabled()) {
      openPaymentTestCheckout(result)
    }
  })
}

async function refundSelected() {
  if (!selectedId.value) {
    return
  }
  const id = selectedId.value
  await runAction(async (token) => {
    const result = await adminRefundPaymentTest(config.public.apiBase, token, id)
    rememberProvider(result.provider)
  })
}

async function issueInvoiceSelected() {
  if (!selectedId.value) {
    return
  }
  const id = selectedId.value
  await runAction(async (token) => {
    const result = await adminIssuePaymentTestInvoice(config.public.apiBase, token, id)
    rememberProvider(result.provider)
  })
}

async function voidInvoiceSelected() {
  if (!selectedId.value) {
    return
  }
  const id = selectedId.value
  await runAction(async (token) => {
    const result = await adminVoidPaymentTestInvoice(config.public.apiBase, token, id, {
      reason: 'admin payment test void'
    })
    rememberProvider(result.provider)
  })
}

function selectOrder(id: string) {
  selectedId.value = id
  syncProviderFromSelected()
}

function operatorLabel(operatorId: string | null) {
  if (!operatorId) {
    return '—'
  }
  return operatorId.length > 12 ? `${operatorId.slice(0, 8)}…` : operatorId
}

function auditEnvLabel(env: PaymentTestEnvironment | null) {
  return env ? envLabel(env) : '—'
}

function paymentStatusLabel(status: PaymentTestOrder['payment_status']) {
  return t(`paymentTest.paymentStatus.${status}`)
}

function invoiceStatusLabel(status: PaymentTestOrder['invoice_status']) {
  return t(`paymentTest.invoiceStatus.${status}`)
}

function auditActionLabel(action: PaymentTestAuditLog['action']) {
  return t(`paymentTest.auditAction.${action}`)
}

function envLabel(env: PaymentTestEnvironment) {
  return t(`paymentTest.environment.${env}`)
}
</script>

<template>
  <PageHeader
    :title="$t('nav.paymentTest')"
    plain
  >
    <div
      class="mx-auto flex w-full max-w-5xl flex-col gap-8"
      data-testid="payment-test-page"
    >
      <p
        v-if="scopeNote"
        class="text-sm text-muted"
        data-testid="payment-test-scope-note"
      >
        {{ scopeNote }}
      </p>

      <p
        v-if="errorMessage"
        class="text-sm text-error"
        data-testid="payment-test-error"
      >
        {{ errorMessage }}
      </p>

      <section class="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
        <h2 class="text-sm font-medium text-highlighted sm:pt-2">
          {{ $t('paymentTest.run') }}
        </h2>
        <div class="grid max-w-md gap-3">
          <UInput
            v-model.number="amount"
            type="number"
            :min="1"
            :max="100000"
            :disabled="!canManage || actionPending"
            data-testid="payment-test-amount"
          />
          <URadioGroup
            v-model="environment"
            :items="environmentItems"
            :disabled="!canManage || actionPending"
            orientation="vertical"
            data-testid="payment-test-environment"
          />
          <p
            class="text-sm text-muted"
            data-testid="payment-test-sandbox-key-hint"
          >
            {{ $t('paymentTest.sandboxKeyHint') }}
          </p>
          <p
            v-if="environment === 'production'"
            class="text-sm text-warning"
            data-testid="payment-test-production-warning"
          >
            {{ $t('paymentTest.productionWarning') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              color="primary"
              :loading="actionPending"
              :disabled="!canManage || !amountValid || actionPending"
              data-testid="payment-test-pay"
              @click="startPay"
            >
              {{ $t('paymentTest.actions.pay') }}
            </UButton>
          </div>
          <p
            v-if="credentials"
            class="text-xs text-dimmed"
            data-testid="payment-test-credentials"
          >
            NewebPay {{ credentials.newebpay ? '✓' : '—' }}
            · ezPay {{ credentials.ezpay ? '✓' : '—' }}
          </p>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
        <h2 class="text-sm font-medium text-highlighted sm:pt-2">
          {{ $t('paymentTest.selected') }}
        </h2>
        <div class="grid max-w-md gap-3">
          <p
            v-if="selectedOrder"
            class="font-mono text-sm"
            data-testid="payment-test-selected-order"
          >
            {{ selectedOrder.merchant_order_no }}
            · {{ paymentStatusLabel(selectedOrder.payment_status) }}
            · {{ invoiceStatusLabel(selectedOrder.invoice_status) }}
          </p>
          <p
            v-else
            class="text-sm text-muted"
          >
            {{ $t('paymentTest.noneSelected') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="!canManage || !selectedOrder || actionPending"
              data-testid="payment-test-refund"
              @click="refundSelected"
            >
              {{ $t('paymentTest.actions.refund') }}
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              :disabled="!canManage || !selectedOrder || actionPending"
              data-testid="payment-test-invoice"
              @click="issueInvoiceSelected"
            >
              {{ $t('paymentTest.actions.invoice') }}
            </UButton>
            <UButton
              color="neutral"
              variant="soft"
              :disabled="!canManage || !selectedOrder || actionPending"
              data-testid="payment-test-invoice-void"
              @click="voidInvoiceSelected"
            >
              {{ $t('paymentTest.actions.invoiceVoid') }}
            </UButton>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
        <h2 class="text-sm font-medium text-highlighted sm:pt-2">
          {{ $t('paymentTest.provider') }}
        </h2>
        <div
          class="max-w-md rounded-md border border-default px-3 py-2 font-mono text-sm"
          data-testid="payment-test-provider"
        >
          <template v-if="lastProvider">
            <div>Status: {{ lastProvider.status || '—' }}</div>
            <div>Message: {{ lastProvider.message || '—' }}</div>
          </template>
          <template v-else>
            <div class="text-muted">
              {{ $t('paymentTest.providerEmpty') }}
            </div>
          </template>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
        <h2 class="text-sm font-medium text-highlighted sm:pt-2">
          {{ $t('paymentTest.orders') }}
        </h2>
        <div class="min-w-0 overflow-x-auto">
          <p
            v-if="pending"
            class="text-sm text-muted"
            data-testid="payment-test-loading"
          >
            {{ $t('paymentTest.loading') }}
          </p>
          <p
            v-else-if="orders.length === 0"
            class="text-sm text-muted"
            data-testid="payment-test-orders-empty"
          >
            {{ $t('paymentTest.emptyOrders') }}
          </p>
          <table
            v-else
            class="w-full min-w-[40rem] border-collapse text-sm"
            data-testid="payment-test-orders"
          >
            <thead>
              <tr class="border-b border-default text-left text-muted">
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.merchantOrderNo') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.amount') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.environment') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.payment') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.invoice') }}
                </th>
                <th class="py-2 font-medium">
                  {{ $t('paymentTest.columns.createdAt') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in orders"
                :key="row.id"
                class="cursor-pointer border-b border-default/60 hover:bg-elevated/50"
                :class="row.id === selectedId ? 'bg-elevated/60' : ''"
                :data-testid="`payment-test-order-${row.id}`"
                @click="selectOrder(row.id)"
              >
                <td class="py-2 pr-3 font-mono">
                  {{ row.merchant_order_no }}
                </td>
                <td class="py-2 pr-3">
                  {{ row.amount }}
                </td>
                <td class="py-2 pr-3">
                  {{ envLabel(row.environment) }}
                </td>
                <td class="py-2 pr-3">
                  {{ paymentStatusLabel(row.payment_status) }}
                </td>
                <td class="py-2 pr-3">
                  {{ invoiceStatusLabel(row.invoice_status) }}
                  <span
                    v-if="row.invoice_number"
                    class="ml-1 font-mono text-xs text-muted"
                  >{{ row.invoice_number }}</span>
                </td>
                <td class="py-2 text-muted">
                  {{ formatLocalDateTime(row.created_at) || row.created_at }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
        <h2 class="text-sm font-medium text-highlighted sm:pt-2">
          {{ $t('paymentTest.auditLogs') }}
        </h2>
        <div class="min-w-0 overflow-x-auto">
          <p
            v-if="!pending && auditLogs.length === 0"
            class="text-sm text-muted"
            data-testid="payment-test-audit-empty"
          >
            {{ $t('paymentTest.emptyAudit') }}
          </p>
          <table
            v-else-if="auditLogs.length > 0"
            class="w-full min-w-[40rem] border-collapse text-sm"
            data-testid="payment-test-audit-logs"
          >
            <thead>
              <tr class="border-b border-default text-left text-muted">
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.action') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.operator') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.environment') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  {{ $t('paymentTest.columns.amount') }}
                </th>
                <th class="py-2 pr-3 font-medium">
                  Status
                </th>
                <th class="py-2 pr-3 font-medium">
                  Message
                </th>
                <th class="py-2 font-medium">
                  {{ $t('paymentTest.columns.createdAt') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in auditLogs"
                :key="row.id"
                class="border-b border-default/60"
              >
                <td class="py-2 pr-3">
                  {{ auditActionLabel(row.action) }}
                </td>
                <td
                  class="py-2 pr-3 font-mono"
                  data-testid="payment-test-audit-operator"
                >
                  {{ operatorLabel(row.operator_id) }}
                </td>
                <td
                  class="py-2 pr-3"
                  data-testid="payment-test-audit-environment"
                >
                  {{ auditEnvLabel(row.environment) }}
                </td>
                <td class="py-2 pr-3">
                  {{ row.amount ?? '—' }}
                </td>
                <td class="py-2 pr-3 font-mono">
                  {{ row.result_status || '—' }}
                </td>
                <td class="py-2 pr-3 font-mono">
                  {{ row.result_message || '—' }}
                </td>
                <td class="py-2 text-muted">
                  {{ formatLocalDateTime(row.created_at) || row.created_at }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </PageHeader>
</template>
