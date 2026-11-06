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
const cancelReason = ref('')
const errorMessage = ref('')

const canCancel = computed(() => {
  const status = booking.value?.status
  return status === 'awaiting_schedule' || status === 'scheduled'
})

const title = computed(() => {
  if (!booking.value) {
    return crumbLabel.value || bookingId.value
  }
  return t('expertBookings.detailTitle', {
    code: shortOrderCode(booking.value.order_no)
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
    crumbLabel.value = shortOrderCode(row.order_no)
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
      booking.value.id,
      cancelReason.value
    )
    cancelOpen.value = false
    cancelReason.value = ''
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
              {{ booking.requirement_note }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('expertBookings.fields.confirmedAt') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              {{
                booking.confirmed_starts_at
                  ? formatLocalDateTime(booking.confirmed_starts_at, { style: 'full' })
                  : $t('expertBookings.fields.notConfirmed')
              }}
              <span
                v-if="booking.confirmed_ends_at"
                class="text-muted"
              >
                – {{ formatLocalDateTime(booking.confirmed_ends_at, { style: 'list' }) }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('expertBookings.fields.contact') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              <div>{{ booking.contact_name }}</div>
              <div>{{ booking.contact_phone }} · {{ booking.contact_email }}</div>
              <div v-if="booking.contact_line">
                LINE: {{ booking.contact_line }}
              </div>
            </dd>
          </div>
          <div v-if="booking.attachments.length">
            <dt class="text-muted">
              {{ $t('expertBookings.fields.attachments') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              <ul class="list-inside list-disc">
                <li
                  v-for="file in booking.attachments"
                  :key="file.key"
                >
                  {{ file.filename }}
                </li>
              </ul>
            </dd>
          </div>
          <div v-if="booking.product_picks.length">
            <dt class="text-muted">
              {{ $t('expertBookings.fields.productPicks') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              <ul class="space-y-1">
                <li
                  v-for="pick in booking.product_picks"
                  :key="pick.id"
                >
                  {{ pick.sellable_item_name || pick.sellable_item_code || pick.sellable_item_id }}
                  — {{ pick.reason }}
                </li>
              </ul>
            </dd>
          </div>
          <div v-if="booking.member_profile">
            <dt class="text-muted">
              {{ $t('expertBookings.fields.memberProfile') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              {{ booking.member_profile.sex || '—' }}
              · {{ booking.member_profile.birth_year || '—' }}
              · {{ booking.member_profile.height_cm || '—' }}cm
              · {{ booking.member_profile.weight_kg || '—' }}kg
              <div
                v-if="booking.member_profile.goals.length"
                class="text-xs text-muted"
              >
                goals: {{ booking.member_profile.goals.join('、') }}
              </div>
            </dd>
          </div>
          <div v-if="booking.service_record">
            <dt class="text-muted">
              {{ $t('expertBookings.fields.serviceRecord') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              <div>{{ booking.service_record.service_method }} · {{ formatLocalDateTime(booking.service_record.served_at, { style: 'full' }) }}</div>
              <div class="text-xs text-muted">
                {{ booking.service_record.content }}
              </div>
              <div
                v-if="booking.service_record.filled_by_operator_id"
                class="mt-1 text-xs text-muted"
              >
                filled_by={{ booking.service_record.filled_by_operator_id }}
                · filled_at={{ booking.service_record.filled_at
                  ? formatLocalDateTime(booking.service_record.filled_at, { style: 'list' })
                  : '—' }}
              </div>
            </dd>
          </div>
          <div v-if="booking.cancel_reason">
            <dt class="text-muted">
              {{ $t('expertBookings.fields.cancelReason') }}
            </dt>
            <dd class="mt-1 text-highlighted">
              {{ booking.cancel_reason }}
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
          <UFormField :label="$t('expertBookings.fields.cancelReasonOptional')">
            <UInput
              v-model="cancelReason"
              class="w-full"
            />
          </UFormField>
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
