<script setup lang="ts">
import {
  completeExpertStationBooking,
  getExpertStationBooking,
  pinExpertStationBooking,
  statusBadgeColor
} from '~/utils/expert-booking-api'
import { preferredSlotsLabel, shortOrderCode } from '~/utils/expert-booking-calendar'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { money } from '~/utils/format'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertBookingDetail } from '~/utils/expert-booking-types'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const bookingId = computed(() => String(route.params.id ?? ''))
const booking = ref<ExpertBookingDetail | null>(null)
const pending = ref(true)
const completing = ref(false)
const errorMessage = ref('')
const expanded = ref<Record<string, boolean>>({})
const visibleConversationCount = ref(2)

const expertId = computed(() => session.operator?.id || 'op-expert-wang')

const visibleConversations = computed(() => {
  if (!booking.value) {
    return []
  }
  return booking.value.conversations.slice(0, visibleConversationCount.value)
})

watch(bookingId, (id) => {
  void load(id)
}, { immediate: true })

async function load(id: string) {
  pending.value = true
  errorMessage.value = ''
  booking.value = null
  if (!id) {
    pending.value = false
    return
  }
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
    booking.value = row
    const map: Record<string, boolean> = {}
    row.conversations.forEach((c, index) => {
      map[c.id] = index === 0
    })
    expanded.value = map
    visibleConversationCount.value = Math.min(2, row.conversations.length)
  } catch {
    errorMessage.value = t('expertBookings.notFound')
  } finally {
    pending.value = false
  }
}

async function togglePin() {
  if (!booking.value) {
    return
  }
  const token = readOperatorToken()
  if (!token) {
    return
  }
  const next = !booking.value.pinned
  await pinExpertStationBooking(
    config.public.apiBase,
    token,
    expertId.value,
    booking.value.id,
    next
  )
  booking.value.pinned = next
}

async function markComplete() {
  if (!booking.value || completing.value) {
    return
  }
  completing.value = true
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    booking.value = await completeExpertStationBooking(
      config.public.apiBase,
      token,
      booking.value.id
    )
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    completing.value = false
  }
}

function loadEarlier() {
  if (!booking.value) {
    return
  }
  visibleConversationCount.value = Math.min(
    booking.value.conversations.length,
    visibleConversationCount.value + 2
  )
}
</script>

<template>
  <div data-testid="expert-station-booking-detail">
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
    <template v-else-if="booking">
      <p class="text-sm text-muted">
        {{ $t('expertStation.nav.bookings') }} /
        {{ shortOrderCode(booking.order_code) }}
      </p>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ shortOrderCode(booking.order_code) }} · {{ booking.member_name }}
        </h1>
        <UBadge
          :color="statusBadgeColor(booking.status)"
          variant="subtle"
        >
          {{ $t(`expertBookings.status.${booking.status}`) }}
        </UBadge>
        <UButton
          size="sm"
          :variant="booking.pinned ? 'soft' : 'outline'"
          :color="booking.pinned ? 'error' : 'neutral'"
          icon="i-lucide-pin"
          @click="togglePin"
        >
          {{ $t('expertStation.bookings.pin') }}
        </UButton>
      </div>
      <p class="mt-1 text-sm text-muted">
        {{
          $t('expertStation.detail.paidLine', {
            paid: formatLocalDateTime(booking.paid_at, { style: 'list' }),
            amount: money(booking.amount).replace(/^NT\$/, '')
          })
        }}
      </p>

      <div
        v-if="booking.status === 'completed'"
        class="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
      >
        {{ $t('expertStation.detail.completedBanner') }}
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <section class="rounded-xl border border-default bg-default p-4">
          <h2 class="font-semibold text-highlighted">
            {{ $t('expertStation.detail.needTitle') }}
          </h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div>
              <dt class="text-muted">
                {{ $t('expertStation.detail.preferred') }}
              </dt>
              <dd class="mt-1 whitespace-pre-line">
                <div
                  v-for="(slot, index) in booking.preferred_slots"
                  :key="`${slot.date}-${slot.start_hour}`"
                >
                  {{ index + 1 }}) {{ preferredSlotsLabel([slot]) }}
                </div>
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                {{ $t('expertStation.detail.need') }}
              </dt>
              <dd class="mt-1">
                {{ booking.need_description }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                {{ $t('expertStation.detail.contact') }}
              </dt>
              <dd class="mt-1">
                {{ booking.contact_phone || '—' }} · {{ booking.contact_email }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="rounded-xl border border-default bg-default p-4">
          <h2 class="font-semibold text-highlighted">
            {{ $t('expertStation.detail.profileTitle') }}
          </h2>
          <p class="mt-3 text-sm text-muted">
            {{ booking.profile.summary }}
          </p>
          <p class="mt-2 text-sm">
            <span class="text-muted">{{ $t('expertStation.detail.goals') }}：</span>
            {{ booking.profile.goals.join('、') }}
          </p>
        </section>
      </div>

      <section class="mt-4 rounded-xl border border-default bg-default p-4">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 class="font-semibold text-highlighted">
              {{ $t('expertStation.detail.conversations') }}
            </h2>
            <p class="text-xs text-muted">
              {{ $t('expertStation.detail.conversationsHint') }}
            </p>
          </div>
        </div>
        <div class="mt-3 space-y-3">
          <div
            v-for="(conversation, index) in visibleConversations"
            :key="conversation.id"
            class="rounded-lg border border-default"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
              @click="expanded[conversation.id] = !expanded[conversation.id]"
            >
              <span>
                對話 #{{ booking.conversations.length - index }} ·
                {{ formatLocalDateTime(conversation.started_at, { style: 'list' }) }}
              </span>
              <span class="text-xs text-muted">
                {{
                  index === 0 && expanded[conversation.id]
                    ? $t('expertStation.detail.latestExpanded')
                    : expanded[conversation.id]
                      ? $t('expertStation.detail.collapse')
                      : $t('expertStation.detail.expand')
                }}
              </span>
            </button>
            <div
              v-if="expanded[conversation.id]"
              class="space-y-2 border-t border-default px-3 py-3"
            >
              <div
                v-for="(message, messageIndex) in conversation.messages"
                :key="`${conversation.id}-${messageIndex}`"
                class="rounded-lg px-3 py-2 text-sm"
                :class="message.role === 'user' ? 'bg-primary/10' : 'bg-elevated'"
              >
                {{ message.content }}
              </div>
            </div>
          </div>
        </div>
        <button
          v-if="booking.conversations.length > visibleConversationCount"
          type="button"
          class="mt-3 text-sm text-primary underline"
          @click="loadEarlier"
        >
          {{ $t('expertStation.detail.loadEarlier') }}
        </button>
      </section>

      <section class="mt-4 rounded-xl border border-default bg-default p-4">
        <h2 class="font-semibold text-highlighted">
          {{ $t('expertStation.detail.confirmTitle') }}
        </h2>
        <p class="mt-2 text-sm text-muted">
          {{ $t('expertStation.detail.confirmCurrent') }}：
          {{
            booking.confirmed_at
              ? formatLocalDateTime(booking.confirmed_at, { style: 'full' })
              : $t('expertBookings.fields.notConfirmed')
          }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <UButton
            color="primary"
            :to="localePath(`/bookings/${encodeURIComponent(booking.id)}/confirm`)"
          >
            {{ $t('expertStation.detail.confirmAction') }}
          </UButton>
          <UButton
            variant="outline"
            :to="localePath(`/bookings/${encodeURIComponent(booking.id)}/service-record`)"
          >
            {{ $t('expertStation.detail.serviceRecord') }}
          </UButton>
          <UButton
            variant="outline"
            :to="localePath(`/bookings/${encodeURIComponent(booking.id)}/selections`)"
          >
            {{ $t('expertStation.detail.selections') }}
          </UButton>
          <UButton
            v-if="booking.status !== 'completed' && booking.status !== 'cancelled'"
            color="success"
            variant="soft"
            :loading="completing"
            @click="markComplete"
          >
            {{ $t('expertStation.detail.complete') }}
          </UButton>
        </div>
        <p class="mt-3 text-xs text-muted">
          {{ $t('expertStation.detail.noCancel') }}
        </p>
      </section>
    </template>
  </div>
</template>
