<script setup lang="ts">
import {
  AdminApiError,
  adminGetPaymentSettings,
  adminPatchPaymentSettings,
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
const paymentPending = ref(true)
const paymentSaving = ref(false)
const paymentError = ref('')
const paymentSaved = ref(false)

if (import.meta.client) {
  void loadPayment()
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
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    paymentError.value = message || t('settings.payment.loadFailed')
  } finally {
    paymentPending.value = false
  }
}

async function savePayment(provider: 'sandbox' | 'newebpay') {
  const token = readOperatorToken()
  if (!token || paymentSaving.value || !canEditPayment.value) {
    return
  }
  paymentSaving.value = true
  paymentError.value = ''
  paymentSaved.value = false
  try {
    payment.value = await adminPatchPaymentSettings(config.public.apiBase, token, provider)
    paymentSaved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    paymentError.value = message || t('settings.payment.saveFailed')
  } finally {
    paymentSaving.value = false
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
        <p class="mt-4 text-sm text-dimmed">
          {{ $t('settings.payment.current') }}:
          <span class="font-medium text-highlighted">{{ payment.provider }}</span>
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('settings.payment.methods') }}: {{ payment.payment_methods.join(', ') }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <UButton
            color="neutral"
            :variant="payment.provider === 'sandbox' ? 'solid' : 'outline'"
            size="sm"
            :disabled="!canEditPayment || paymentSaving"
            @click="savePayment('sandbox')"
          >
            sandbox
          </UButton>
          <UButton
            color="neutral"
            :variant="payment.provider === 'newebpay' ? 'solid' : 'outline'"
            size="sm"
            :disabled="!canEditPayment || paymentSaving"
            @click="savePayment('newebpay')"
          >
            newebpay
          </UButton>
        </div>
        <p
          v-if="!canEditPayment"
          class="mt-2 text-sm text-muted"
        >
          {{ $t('actions.readOnly') }}
        </p>
        <p
          v-if="paymentSaved"
          class="mt-2 text-sm text-success"
        >
          {{ $t('actions.saved') }}
        </p>
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
