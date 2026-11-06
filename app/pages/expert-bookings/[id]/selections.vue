<script setup lang="ts">
import {
  getAdminExpertBooking,
  listExpertBookingSellableOptions,
  putAdminExpertBookingProductPicks
} from '~/utils/expert-booking-api'
import { shortOrderCode } from '~/utils/expert-booking-calendar'
import { readOperatorToken } from '~/utils/operator-session'
import type {
  ExpertBookingProductPickDraft,
  ExpertBookingSellableOption
} from '~/utils/expert-booking-types'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const crumbLabel = useExpertBookingCrumbLabel()

const bookingId = computed(() => String(route.params.id ?? ''))
const options = ref<ExpertBookingSellableOption[]>([])
const selected = ref<ExpertBookingProductPickDraft[]>([])
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const okMessage = ref('')

watch(bookingId, (id) => {
  void load(id)
}, { immediate: true })

async function load(id: string) {
  pending.value = true
  errorMessage.value = ''
  okMessage.value = ''
  if (!id) {
    pending.value = false
    errorMessage.value = t('expertBookings.failed')
    return
  }
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const [booking, sellables] = await Promise.all([
      getAdminExpertBooking(config.public.apiBase, token, id),
      listExpertBookingSellableOptions(config.public.apiBase, token)
    ])
    crumbLabel.value = shortOrderCode(booking.order_no)
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
  if (saving.value || !bookingId.value) {
    return
  }
  saving.value = true
  errorMessage.value = ''
  okMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const picks = await putAdminExpertBookingProductPicks(
      config.public.apiBase,
      token,
      bookingId.value,
      selected.value.map(row => ({
        sellable_item_id: row.sellable_item_id,
        reason: row.reason
      }))
    )
    selected.value = picks.map(row => ({
      sellable_item_id: row.sellable_item_id,
      name_zh: row.sellable_item_name || row.sellable_item_code || row.sellable_item_id,
      name_en: row.sellable_item_name || '',
      reason: row.reason
    }))
    okMessage.value = t('expertBookings.selections.saved')
  } catch {
    errorMessage.value = t('expertBookings.selections.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader
    :title="$t('expertBookings.selections.title')"
    plain
  >
    <p class="mb-4 text-sm text-muted">
      {{ $t('expertBookings.selections.hint') }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('expertBookings.loading') }}
    </p>
    <template v-else>
      <p
        v-if="errorMessage"
        class="mb-3 text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="okMessage"
        class="mb-3 text-sm text-success"
      >
        {{ okMessage }}
      </p>
      <ExpertBookingProductReasonsForm
        v-model="selected"
        :options="options"
        :pending="saving"
        @save="onSave"
      />
      <div class="mt-4">
        <UButton
          variant="ghost"
          :to="localePath(`/expert-bookings/${encodeURIComponent(bookingId)}`)"
        >
          ← {{ $t('expertBookings.details') }}
        </UButton>
      </div>
    </template>
  </PageHeader>
</template>
