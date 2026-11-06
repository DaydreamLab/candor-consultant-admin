<script setup lang="ts">
import {
  getExpertStationBooking,
  listExpertBookingSellableOptions,
  putExpertStationProductPicks
} from '~/utils/expert-booking-api'
import { readOperatorToken } from '~/utils/operator-session'
import type {
  ExpertBookingProductPickDraft,
  ExpertBookingSellableOption
} from '~/utils/expert-booking-types'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const bookingId = computed(() => String(route.params.id ?? ''))
const expertId = computed(() => session.operator?.id || 'op-expert-wang')
const contactName = ref('')
const options = ref<ExpertBookingSellableOption[]>([])
const selected = ref<ExpertBookingProductPickDraft[]>([])
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')

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
    const [booking, sellables] = await Promise.all([
      getExpertStationBooking(config.public.apiBase, token, expertId.value, id),
      listExpertBookingSellableOptions(config.public.apiBase, token)
    ])
    contactName.value = booking.contact_name
    options.value = sellables
    selected.value = booking.product_picks.map(row => ({
      sellable_item_id: row.sellable_item_id,
      name_zh: row.sellable_item_name || row.sellable_item_code || row.sellable_item_id,
      name_en: row.sellable_item_name || '',
      reason: row.reason
    }))
  } catch {
    errorMessage.value = t('expertBookings.notFound')
  } finally {
    pending.value = false
  }
}

async function onSave() {
  if (saving.value) {
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    await putExpertStationProductPicks(
      config.public.apiBase,
      token,
      bookingId.value,
      selected.value.map(row => ({
        sellable_item_id: row.sellable_item_id,
        reason: row.reason
      }))
    )
    await navigateTo(localePath(`/bookings/${encodeURIComponent(bookingId.value)}`))
  } catch {
    errorMessage.value = t('expertBookings.selections.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <p class="text-sm text-muted">
      {{ contactName || bookingId }} / {{ $t('expertStation.detail.selections') }}
    </p>
    <h1 class="mt-2 text-2xl font-semibold text-highlighted">
      {{ $t('expertStation.selections.title') }}
      <span class="ml-2 text-sm font-normal text-muted">
        {{ $t('expertStation.selections.forCustomer') }}
      </span>
    </h1>
    <p class="mt-2 text-sm text-muted">
      {{ $t('expertStation.selections.hint') }}
    </p>
    <p
      v-if="pending"
      class="mt-4 text-sm text-muted"
    >
      {{ $t('expertBookings.loading') }}
    </p>
    <div
      v-else
      class="mt-4 max-w-2xl rounded-xl border border-default bg-default p-4"
    >
      <p
        v-if="errorMessage"
        class="mb-3 text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <ExpertBookingProductReasonsForm
        v-model="selected"
        :options="options"
        :pending="saving"
        @save="onSave"
      >
        <template #save-label>
          {{ $t('expertStation.selections.save') }}
        </template>
      </ExpertBookingProductReasonsForm>
    </div>
  </div>
</template>
