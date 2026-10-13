<script setup lang="ts">
import {
  AdminApiError,
  adminGetInvoiceSettings,
  adminGetPaymentSettings,
  adminPatchInvoiceSettings,
  adminPatchPaymentSettings,
  type AdminInvoiceSettings,
  type AdminPaymentSettings
} from '~/utils/admin-api'
import { DEMO_LABELS } from '~/utils/demo'
import { readOperatorToken } from '~/utils/operator-session'

const { locale, t } = useI18n()
const { moduleDesc } = usePageCopy()
const { platform, currentOrg } = useOrgScope()
const config = useRuntimeConfig()
const session = useSessionStore()

const org = computed(() => currentOrg())
const canEditPayment = computed(() => {
  const role = session.operator?.role
  return role === 'ops' || role === 'admin'
})

const payment = ref<AdminPaymentSettings | null>(null)
const paymentDraft = ref<'sandbox' | 'newebpay'>('sandbox')
const paymentPending = ref(true)
const paymentSaving = ref(false)
const paymentError = ref('')
const paymentSaved = ref(false)

const invoice = ref<AdminInvoiceSettings | null>(null)
const invoiceDraft = ref<'sandbox' | 'ezpay'>('sandbox')
const invoicePending = ref(true)
const invoiceSaving = ref(false)
const invoiceError = ref('')
const invoiceSaved = ref(false)

const paymentDirty = computed(() => payment.value !== null && paymentDraft.value !== payment.value.provider)
const invoiceDirty = computed(() => invoice.value !== null && invoiceDraft.value !== invoice.value.issuer)

const paymentItems = computed(() => [
  { label: t('settings.payment.optionSandbox'), value: 'sandbox' },
  { label: t('settings.payment.optionNewebpay'), value: 'newebpay' }
])

const invoiceItems = computed(() => [
  { label: t('settings.invoice.optionSandbox'), value: 'sandbox' },
  { label: t('settings.invoice.optionEzpay'), value: 'ezpay' }
])

const showInvoiceCredentialsWarning = computed(
  () => invoiceDraft.value === 'ezpay' && invoice.value?.credentials_configured === false
)

if (import.meta.client) {
  void loadPayment()
  void loadInvoice()
}

async function loadPayment() {
  const token = readOperatorToken()
  if (!token) {
    paymentError.value = t('settings.payment.loadFailed')
    paymentPending.value = false
    return
  }
  paymentPending.value = true
  paymentError.value = ''
  paymentSaved.value = false
  try {
    payment.value = await adminGetPaymentSettings(config.public.apiBase, token)
    paymentDraft.value = payment.value.provider
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    paymentError.value = message || t('settings.payment.loadFailed')
  } finally {
    paymentPending.value = false
  }
}

async function savePayment() {
  const token = readOperatorToken()
  if (!token || paymentSaving.value || !canEditPayment.value || !paymentDirty.value) {
    return
  }
  paymentSaving.value = true
  paymentError.value = ''
  paymentSaved.value = false
  try {
    payment.value = await adminPatchPaymentSettings(config.public.apiBase, token, paymentDraft.value)
    paymentDraft.value = payment.value.provider
    paymentSaved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    paymentError.value = message || t('settings.payment.saveFailed')
  } finally {
    paymentSaving.value = false
  }
}

async function loadInvoice() {
  const token = readOperatorToken()
  if (!token) {
    invoiceError.value = t('settings.invoice.loadFailed')
    invoicePending.value = false
    return
  }
  invoicePending.value = true
  invoiceError.value = ''
  invoiceSaved.value = false
  try {
    invoice.value = await adminGetInvoiceSettings(config.public.apiBase, token)
    invoiceDraft.value = invoice.value.issuer
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    invoiceError.value = message || t('settings.invoice.loadFailed')
  } finally {
    invoicePending.value = false
  }
}

async function saveInvoice() {
  const token = readOperatorToken()
  if (!token || invoiceSaving.value || !canEditPayment.value || !invoiceDirty.value) {
    return
  }
  invoiceSaving.value = true
  invoiceError.value = ''
  invoiceSaved.value = false
  try {
    invoice.value = await adminPatchInvoiceSettings(config.public.apiBase, token, invoiceDraft.value)
    invoiceDraft.value = invoice.value.issuer
    invoiceSaved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    invoiceError.value = message || t('settings.invoice.saveFailed')
  } finally {
    invoiceSaving.value = false
  }
}

function labelName(row: (typeof DEMO_LABELS)[number]) {
  return locale.value === 'en' ? row.nameEn : row.name
}

function warehouseName() {
  if (!org.value) {
    return locale.value === 'en' ? 'Candor platform' : '坦見平台'
  }
  return locale.value === 'en' ? org.value.warehouseEn : org.value.warehouse
}

function methodLabel(method: string) {
  return t(`settings.payment.method.${method}`, method)
}
</script>

<template>
  <PageHeader
    :title="$t('nav.settings')"
    :description="moduleDesc('settings')"
  >
    <p class="mb-6 max-w-3xl text-base text-muted">
      {{ $t('settings.intro') }}
    </p>

    <section class="mb-6 rounded-xl border border-default bg-elevated p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.version.title') }}
      </h2>
      <BuildVersion class="mt-4" />
    </section>

    <section class="mb-6 rounded-xl border border-default bg-elevated p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.payment.title') }}
      </h2>
      <p class="mt-2 text-sm text-muted">
        {{ $t('settings.payment.hint') }}
      </p>
      <p
        v-if="paymentPending"
        class="mt-4 text-sm text-muted"
      >
        {{ $t('settings.payment.loading') }}
      </p>
      <p
        v-else-if="paymentError"
        class="mt-4 text-sm text-error"
      >
        {{ paymentError }}
      </p>
      <template v-else-if="payment">
        <p class="mt-4 text-sm text-muted">
          {{ $t('settings.payment.methods') }}:
          {{ payment.payment_methods.map(methodLabel).join('、') }}
        </p>
        <URadioGroup
          v-model="paymentDraft"
          class="mt-4"
          :items="paymentItems"
          :disabled="!canEditPayment || paymentSaving"
          orientation="vertical"
        />
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UButton
            color="primary"
            size="sm"
            :disabled="!canEditPayment || paymentSaving || !paymentDirty"
            :loading="paymentSaving"
            @click="savePayment"
          >
            {{ $t('actions.save') }}
          </UButton>
          <p
            v-if="!canEditPayment"
            class="text-sm text-muted"
          >
            {{ $t('actions.readOnly') }}
          </p>
          <p
            v-if="paymentSaved"
            class="text-sm text-success"
          >
            {{ $t('actions.saved') }}
          </p>
        </div>
      </template>
    </section>

    <section class="mb-6 rounded-xl border border-default bg-elevated p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.invoice.title') }}
      </h2>
      <p class="mt-2 text-sm text-muted">
        {{ $t('settings.invoice.hint') }}
      </p>
      <p
        v-if="invoicePending"
        class="mt-4 text-sm text-muted"
      >
        {{ $t('settings.invoice.loading') }}
      </p>
      <p
        v-else-if="invoiceError"
        class="mt-4 text-sm text-error"
      >
        {{ invoiceError }}
      </p>
      <template v-else-if="invoice">
        <URadioGroup
          v-model="invoiceDraft"
          class="mt-4"
          :items="invoiceItems"
          :disabled="!canEditPayment || invoiceSaving"
          orientation="vertical"
        />
        <p
          v-if="showInvoiceCredentialsWarning"
          class="mt-3 text-sm text-warning"
        >
          {{ $t('settings.invoice.credentialsMissing') }}
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UButton
            color="primary"
            size="sm"
            :disabled="!canEditPayment || invoiceSaving || !invoiceDirty"
            :loading="invoiceSaving"
            @click="saveInvoice"
          >
            {{ $t('actions.save') }}
          </UButton>
          <p
            v-if="!canEditPayment"
            class="text-sm text-muted"
          >
            {{ $t('actions.readOnly') }}
          </p>
          <p
            v-if="invoiceSaved"
            class="text-sm text-success"
          >
            {{ $t('actions.saved') }}
          </p>
        </div>
      </template>
    </section>

    <div class="mb-6 grid gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('settings.notice') }}
        </h2>
        <p class="mt-2 text-sm text-muted">
          {{ $t('settings.noticeHint') }}
        </p>
        <p class="mt-4 text-sm text-dimmed">
          {{ $t('settings.noticeEmail') }}
        </p>
        <p class="mt-1 text-base font-medium text-highlighted">
          {{ platform ? 'owner@candor.local' : (org?.contact ?? '—') }}
        </p>
      </section>
      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('settings.warehouse') }}
        </h2>
        <p class="mt-2 text-sm text-muted">
          {{ $t('settings.warehouseHint') }}
        </p>
        <p class="mt-4 text-base font-medium text-highlighted">
          {{ warehouseName() }}
        </p>
      </section>
    </div>

    <section class="rounded-xl border border-default bg-elevated p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.labels') }}
      </h2>
      <p class="mt-2 mb-4 text-sm text-muted">
        {{ platform ? $t('settings.labelsHintPlatform') : $t('settings.labelsHintFirm') }}
      </p>
      <AdminTable :empty="!DEMO_LABELS.length">
        <template #head>
          <tr>
            <th>ID</th>
            <th>{{ $t('col.name') }}</th>
            <th>{{ $t('col.effective') }}</th>
            <th>{{ $t('col.current') }}</th>
          </tr>
        </template>
        <tr
          v-for="row in DEMO_LABELS"
          :key="row.id"
          class="border-b border-default last:border-0"
        >
          <td class="font-medium text-highlighted">
            {{ row.id }}
          </td>
          <td>
            {{ labelName(row) }}
          </td>
          <td class="text-muted">
            {{ row.effective }}
          </td>
          <td>
            <StatusBadge
              :label="row.current ? $t('status.yes') : $t('status.no')"
              :color="row.current ? 'success' : 'neutral'"
            />
          </td>
        </tr>
      </AdminTable>
    </section>
  </PageHeader>
</template>
