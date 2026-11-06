<script setup lang="ts">
import { putExpertStationConfirmTime, getExpertStationBooking } from '~/utils/expert-booking-api'
import { readOperatorToken } from '~/utils/operator-session'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const bookingId = computed(() => String(route.params.id ?? ''))
const expertId = computed(() => session.operator?.id || 'op-expert-wang')
const confirmedStartsAt = ref('2026-04-10 18:00')
const confirmedEndsAt = ref('2026-04-10 18:30')
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const contactName = ref('')

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
    contactName.value = row.contact_name
    if (row.confirmed_starts_at) {
      confirmedStartsAt.value = formatForInput(row.confirmed_starts_at)
    }
    if (row.confirmed_ends_at) {
      confirmedEndsAt.value = formatForInput(row.confirmed_ends_at)
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
      {
        confirmed_starts_at: toIso(confirmedStartsAt.value),
        confirmed_ends_at: confirmedEndsAt.value.trim()
          ? toIso(confirmedEndsAt.value)
          : null
      }
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
      {{ contactName || bookingId }} / {{ $t('expertStation.detail.confirmTitle') }}
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
        :label="$t('expertStation.confirm.fieldStart')"
        required
      >
        <UInput
          v-model="confirmedStartsAt"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('expertStation.confirm.fieldEnd')">
        <UInput
          v-model="confirmedEndsAt"
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
