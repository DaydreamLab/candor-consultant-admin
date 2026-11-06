<script setup lang="ts">
import { putExpertStationConfirmTime, getExpertStationBooking } from '~/utils/expert-booking-api'
import { shortOrderCode } from '~/utils/expert-booking-calendar'
import { readOperatorToken } from '~/utils/operator-session'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const bookingId = computed(() => String(route.params.id ?? ''))
const expertId = computed(() => session.operator?.id || 'op-expert-wang')
const confirmedAt = ref('2026-11-12 15:00')
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const orderCode = ref('')

watch(bookingId, (id) => {
  void load(id)
}, { immediate: true })

async function load(id: string) {
  pending.value = true
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const row = await getExpertStationBooking(
      config.public.apiBase,
      token,
      expertId.value,
      id
    )
    orderCode.value = shortOrderCode(row.order_code)
    if (row.confirmed_at) {
      confirmedAt.value = formatForInput(row.confirmed_at)
    }
  } catch {
    errorMessage.value = t('expertBookings.notFound')
  } finally {
    pending.value = false
  }
}

function formatForInput(iso: string) {
  return iso.replace('T', ' ').slice(0, 16)
}

function toIso(local: string) {
  const trimmed = local.trim().replace(' ', 'T')
  if (/[+-]\d{2}:?\d{2}$|Z$/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed}:00+08:00`
}

async function onSave() {
  if (saving.value || !bookingId.value) {
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    await putExpertStationConfirmTime(
      config.public.apiBase,
      token,
      expertId.value,
      bookingId.value,
      toIso(confirmedAt.value)
    )
    await navigateTo(localePath(`/bookings/${encodeURIComponent(bookingId.value)}`))
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <p class="text-sm text-muted">
      {{ orderCode || bookingId }} / {{ $t('expertStation.detail.confirmTitle') }}
    </p>
    <h1 class="mt-2 text-2xl font-semibold text-highlighted">
      {{ $t('expertStation.confirm.title') }}
    </h1>
    <p
      v-if="pending"
      class="mt-4 text-sm text-muted"
    >
      {{ $t('expertBookings.loading') }}
    </p>
    <div
      v-else
      class="mt-4 max-w-lg space-y-4 rounded-xl border border-default bg-default p-4"
    >
      <UFormField
        :label="$t('expertStation.confirm.field')"
        required
      >
        <UInput
          v-model="confirmedAt"
          class="w-full"
        />
      </UFormField>
      <p class="rounded-lg border border-dashed border-default px-3 py-2 text-xs text-muted">
        {{ $t('expertStation.confirm.hint') }}
      </p>
      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <div class="flex gap-2">
        <UButton
          color="primary"
          :loading="saving"
          @click="onSave"
        >
          {{ $t('expertStation.confirm.save') }}
        </UButton>
        <UButton
          variant="outline"
          :to="localePath(`/bookings/${encodeURIComponent(bookingId)}`)"
        >
          {{ $t('expertStation.confirm.cancel') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
