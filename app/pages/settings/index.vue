<script setup lang="ts">
import {
  AdminApiError,
  adminGetBiomarkerInterpretationSettings,
  adminGetInvoiceSettings,
  adminGetPaymentSettings,
  adminPatchBiomarkerInterpretationSettings,
  adminPatchInvoiceSettings,
  adminPatchPaymentSettings,
  normalizeBiomarkerMaxLlmDraft,
  type AdminBiomarkerInterpretationSettings,
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

const biomarkerInterpretation = ref<AdminBiomarkerInterpretationSettings | null>(null)
const biomarkerMaxLlmDraft = ref('')
const biomarkerPending = ref(true)
const biomarkerSaving = ref(false)
const biomarkerError = ref('')
const biomarkerSaved = ref(false)
const biomarkerValidationError = ref('')

const biomarkerDraftNormalized = computed(() => normalizeBiomarkerMaxLlmDraft(biomarkerMaxLlmDraft.value))

const biomarkerDirty = computed(() => {
  if (biomarkerInterpretation.value === null) {
    return false
  }
  const draft = biomarkerDraftNormalized.value
  if (draft === 'invalid') {
    return true
  }
  return draft !== biomarkerInterpretation.value.max_llm_calls_per_read
})

const biomarkerSaveDisabled = computed(
  () =>
    !canEditPayment.value
    || biomarkerSaving.value
    || !biomarkerDirty.value
    || biomarkerDraftNormalized.value === 'invalid'
)

if (import.meta.client) {
  void loadPayment()
  void loadInvoice()
  void loadBiomarkerInterpretation()
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

async function loadBiomarkerInterpretation() {
  const token = readOperatorToken()
  if (!token) {
    biomarkerError.value = t('settings.biomarkerInterpretation.loadFailed')
    biomarkerPending.value = false
    return
  }
  biomarkerPending.value = true
  biomarkerError.value = ''
  biomarkerSaved.value = false
  biomarkerValidationError.value = ''
  try {
    biomarkerInterpretation.value = await adminGetBiomarkerInterpretationSettings(config.public.apiBase, token)
    const max = biomarkerInterpretation.value.max_llm_calls_per_read
    biomarkerMaxLlmDraft.value = max === null ? '' : String(max)
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    biomarkerError.value = message || t('settings.biomarkerInterpretation.loadFailed')
  } finally {
    biomarkerPending.value = false
  }
}

async function saveBiomarkerInterpretation() {
  const token = readOperatorToken()
  if (!token || biomarkerSaving.value || !canEditPayment.value || biomarkerSaveDisabled.value) {
    return
  }
  const normalized = biomarkerDraftNormalized.value
  if (normalized === 'invalid') {
    biomarkerValidationError.value = t('settings.biomarkerInterpretation.invalid')
    return
  }
  biomarkerSaving.value = true
  biomarkerError.value = ''
  biomarkerSaved.value = false
  biomarkerValidationError.value = ''
  try {
    biomarkerInterpretation.value = await adminPatchBiomarkerInterpretationSettings(
      config.public.apiBase,
      token,
      normalized
    )
    const max = biomarkerInterpretation.value.max_llm_calls_per_read
    biomarkerMaxLlmDraft.value = max === null ? '' : String(max)
    biomarkerSaved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    biomarkerError.value = message || t('settings.biomarkerInterpretation.saveFailed')
  } finally {
    biomarkerSaving.value = false
  }
}

function clearBiomarkerMaxLlm() {
  biomarkerMaxLlmDraft.value = ''
  biomarkerValidationError.value = ''
  biomarkerSaved.value = false
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

    <section class="mb-6 rounded-xl border border-default bg-elevated p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.biomarkerInterpretation.title') }}
      </h2>
      <p class="mt-2 text-sm text-muted">
        {{ $t('settings.biomarkerInterpretation.hint') }}
      </p>
      <p
        v-if="biomarkerPending"
        class="mt-4 text-sm text-muted"
      >
        {{ $t('settings.biomarkerInterpretation.loading') }}
      </p>
      <p
        v-else-if="biomarkerError"
        class="mt-4 text-sm text-error"
      >
        {{ biomarkerError }}
      </p>
      <template v-else-if="biomarkerInterpretation">
        <UFormField
          class="mt-4 max-w-xs"
          :label="$t('settings.biomarkerInterpretation.fieldLabel')"
          :help="$t('settings.biomarkerInterpretation.fieldHelp')"
        >
          <UInput
            v-model="biomarkerMaxLlmDraft"
            type="number"
            min="1"
            step="1"
            :placeholder="$t('settings.biomarkerInterpretation.unlimitedPlaceholder')"
            :disabled="!canEditPayment || biomarkerSaving"
            @input="biomarkerValidationError = ''; biomarkerSaved = false"
          />
        </UFormField>
        <p class="mt-2 text-sm text-muted">
          {{ $t('settings.biomarkerInterpretation.unlimitedNote') }}
        </p>
        <p
          v-if="biomarkerValidationError || biomarkerDraftNormalized === 'invalid'"
          class="mt-2 text-sm text-error"
        >
          {{ biomarkerValidationError || $t('settings.biomarkerInterpretation.invalid') }}
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!canEditPayment || biomarkerSaving || !biomarkerMaxLlmDraft"
            @click="clearBiomarkerMaxLlm"
          >
            {{ $t('settings.biomarkerInterpretation.clearUnlimited') }}
          </UButton>
          <UButton
            color="primary"
            size="sm"
            :disabled="biomarkerSaveDisabled"
            :loading="biomarkerSaving"
            @click="saveBiomarkerInterpretation"
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
            v-if="biomarkerSaved"
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
