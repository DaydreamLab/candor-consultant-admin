<script setup lang="ts">
import {
  cancelAdminExpertBooking,
  getAdminExpertBooking,
  statusBadgeColor
} from '~/utils/expert-booking-api'
import { preferredSlotsLabel, shortOrderCode } from '~/utils/expert-booking-calendar'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertBookingDetail } from '~/utils/expert-booking-types'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const crumbLabel = useExpertBookingCrumbLabel()

const bookingId = computed(() => String(route.params.id ?? ''))
const booking = ref<ExpertBookingDetail | null>(null)
const pending = ref(true)
const cancelling = ref(false)
const cancelOpen = ref(false)
const errorMessage = ref('')

const canCancel = computed(() => {
  const status = booking.value?.status
  return status === 'pending_schedule' || status === 'scheduled'
})

const title = computed(() => {
  if (!booking.value) {
    return crumbLabel.value || bookingId.value
  }
  return t('expertBookings.detailTitle', {
    code: shortOrderCode(booking.value.order_code)
  })
})

watch(bookingId, (id) => {
  void load(id)
}, { immediate: true })

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/expert-bookings/')) {
    crumbLabel.value = null
  }
})

async function load(id: string) {
  pending.value = true
  errorMessage.value = ''
  booking.value = null
  crumbLabel.value = null
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
    const row = await getAdminExpertBooking(config.public.apiBase, token, id)
    booking.value = row
    crumbLabel.value = shortOrderCode(row.order_code)
  } catch {
    errorMessage.value = t('expertBookings.notFound')
  } finally {
    pending.value = false
  }
}

async function confirmCancel() {
  if (!booking.value || !canCancel.value || cancelling.value) {
    return
  }
  cancelling.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    booking.value = await cancelAdminExpertBooking(
      config.public.apiBase,
      token,
      booking.value.id
    )
    cancelOpen.value = false
  } catch {
    errorMessage.value = t('expertBookings.actions.cancelFailed')
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <PageHeader
    :title="title"
    :description="$t('expertBookings.detailDescription')"
    plain
  >
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('expertBookings.loading') }}
    </p>
    <p
      v-else-if="errorMessage && !booking"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <div
      v-else-if="booking"
      class="grid gap-4 lg:grid-cols-[1fr_280px]"
      data-testid="expert-booking-detail"
    >
      <section class="rounded-xl border border-default bg-elevated p-4">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <UBadge
            :color="statusBadgeColor(booking.status)"
            variant="subtle"
          >
            {{ $t(`expertBookings.status.${booking.status}`) }}
          </UBadge>
          <UBadge
            color="success"
            variant="subtle"
          >
            {{ $t(`expertBookings.payment.${booking.payment_status}`) }}
          </UBadge>
        </div>

        <dl class="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt class="text-muted">
              {{ $t('expertBookings.fields.preferredSlots') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              {{ preferredSlotsLabel(booking.preferred_slots) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('expertBookings.fields.need') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              {{ booking.need_description }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('expertBookings.fields.confirmedAt') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              {{
                booking.confirmed_at
                  ? formatLocalDateTime(booking.confirmed_at, { style: 'full' })
                  : $t('expertBookings.fields.notConfirmed')
              }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('expertBookings.fields.expert') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              {{ booking.annotated_expert_name || $t('expertBookings.fields.expertHint') }}
            </dd>
          </div>
        </dl>
      </section>

      <aside class="space-y-3 rounded-xl border border-default bg-elevated p-4">
        <UButton
          block
          variant="outline"
          color="primary"
          :to="localePath(`/expert-bookings/${encodeURIComponent(booking.id)}/selections`)"
        >
          {{ $t('expertBookings.actions.editSelections') }}
        </UButton>
        <UButton
          v-if="canCancel"
          block
          color="error"
          variant="outline"
          data-testid="expert-booking-cancel"
          @click="cancelOpen = true"
        >
          {{ $t('expertBookings.actions.cancel') }}
        </UButton>
        <p class="text-xs text-muted">
          {{ $t('expertBookings.actions.cancelHint') }}
        </p>
        <NuxtLink
          class="text-sm text-primary underline"
          :to="localePath(`/orders/${encodeURIComponent(booking.order_id)}`)"
        >
          → {{ $t('expertBookings.actions.openOrder') }}
        </NuxtLink>
        <p
          v-if="errorMessage"
          class="text-sm text-error"
        >
          {{ errorMessage }}
        </p>
      </aside>
    </div>

    <UModal v-model:open="cancelOpen">
      <template #content>
        <div
          class="space-y-4 p-5"
          data-testid="expert-booking-cancel-modal"
        >
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('expertBookings.actions.confirmCancelTitle') }}
          </h2>
          <p class="text-sm text-muted">
            {{ $t('expertBookings.actions.confirmCancelBody') }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              :disabled="cancelling"
              @click="cancelOpen = false"
            >
              {{ $t('expertBookings.actions.confirmCancelBack') }}
            </UButton>
            <UButton
              color="error"
              :loading="cancelling"
              data-testid="expert-booking-cancel-confirm"
              @click="confirmCancel"
            >
              {{ $t('expertBookings.actions.confirmCancelOk') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </PageHeader>
</template>
