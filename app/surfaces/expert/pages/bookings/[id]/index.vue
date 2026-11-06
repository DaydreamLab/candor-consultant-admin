<script setup lang="ts">
import {
  completeExpertStationBooking,
  getExpertStationBooking,
  listExpertStationBookingConversations,
  pinExpertStationBooking,
  statusBadgeColor
} from '~/utils/expert-booking-api'
import { shortOrderCode } from '~/utils/expert-booking-calendar'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { readOperatorToken } from '~/utils/operator-session'
import type {
  ExpertBookingConversation,
  ExpertBookingDetail
} from '~/utils/expert-booking-types'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const bookingId = computed(() => String(route.params.id ?? ''))
const booking = ref<ExpertBookingDetail | null>(null)
const conversations = ref<ExpertBookingConversation[]>([])
const pending = ref(true)
const completing = ref(false)
const errorMessage = ref('')
const expanded = ref<Record<string, boolean>>({})
const visibleConversationCount = ref(2)

const expertId = computed(() => session.operator?.id || 'op-expert-wang')

const visibleConversations = computed(() =>
  conversations.value.slice(0, visibleConversationCount.value)
)

watch(bookingId, (id) => {
  void load(id)
}, { immediate: true })

async function load(id: string) {
  pending.value = true
  errorMessage.value = ''
  booking.value = null
  conversations.value = []
  if (!id) {
    pending.value = false
    return
  }
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const [row, conv] = await Promise.all([
      getExpertStationBooking(config.public.apiBase, token, expertId.value, id),
      listExpertStationBookingConversations(
        config.public.apiBase,
        token,
        expertId.value,
        id
      )
    ])
    booking.value = row
    conversations.value = conv.conversations
    const map: Record<string, boolean> = {}
    conv.conversations.forEach((c, index) => {
      map[c.id] = index === 0
    })
    expanded.value = map
    visibleConversationCount.value = Math.min(2, conv.conversations.length)
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
  visibleConversationCount.value = Math.min(
    conversations.value.length,
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
        {{ shortOrderCode(booking.order_no) }}
      </p>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ shortOrderCode(booking.order_no) }} · {{ booking.contact_name }}
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
          booking.paid_at
            ? $t('expertStation.detail.paidAt', {
              paid: formatLocalDateTime(booking.paid_at, { style: 'list' })
            })
            : booking.member_email
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
                  :key="`${index}-${slot}`"
                >
                  {{ index + 1 }}) {{ slot }}
                </div>
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                {{ $t('expertStation.detail.need') }}
              </dt>
              <dd class="mt-1">
                {{ booking.requirement_note }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                {{ $t('expertStation.detail.contact') }}
              </dt>
              <dd class="mt-1">
                {{ booking.contact_phone || '—' }} · {{ booking.contact_email }}
                <span v-if="booking.contact_line">
                  · LINE {{ booking.contact_line }}
                </span>
              </dd>
            </div>
            <div v-if="booking.attachments.length">
              <dt class="text-muted">
                {{ $t('expertBookings.fields.attachments') }}
              </dt>
              <dd class="mt-1">
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
          </dl>
        </section>

        <section class="rounded-xl border border-default bg-default p-4">
          <h2 class="font-semibold text-highlighted">
            {{ $t('expertStation.detail.profileTitle') }}
          </h2>
          <template v-if="booking.member_profile">
            <p class="mt-3 text-sm">
              {{ booking.member_profile.sex || '—' }}
              · {{ booking.member_profile.birth_year || '—' }}
              · {{ booking.member_profile.height_cm || '—' }}cm
              · {{ booking.member_profile.weight_kg || '—' }}kg
            </p>
            <p class="mt-2 text-sm">
              <span class="text-muted">{{ $t('expertStation.detail.goals') }}：</span>
              {{ booking.member_profile.goals.join('、') || '—' }}
            </p>
            <p
              v-if="booking.member_profile.conditions.length"
              class="mt-1 text-sm"
            >
              <span class="text-muted">{{ $t('expertStation.detail.conditions') }}：</span>
              {{ booking.member_profile.conditions.join('、') }}
            </p>
          </template>
          <p
            v-else
            class="mt-3 text-sm text-muted"
          >
            —
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
                對話 #{{ conversations.length - index }} ·
                {{
                  conversation.created_at
                    ? formatLocalDateTime(conversation.created_at, { style: 'list' })
                    : '—'
                }}
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
                v-for="message in conversation.messages"
                :key="message.id"
                class="rounded-lg px-3 py-2 text-sm"
                :class="message.role === 'user' ? 'bg-primary/10' : 'bg-elevated'"
              >
                {{ message.content }}
              </div>
            </div>
          </div>
        </div>
        <button
          v-if="conversations.length > visibleConversationCount"
          type="button"
          class="mt-3 text-sm text-primary underline"
          @click="loadEarlier"
        >
          {{ $t('expertStation.detail.loadEarlier') }}
        </button>
      </section>

      <section
        v-if="booking.product_picks.length"
        class="mt-4 rounded-xl border border-default bg-default p-4"
      >
        <h2 class="font-semibold text-highlighted">
          {{ $t('expertBookings.fields.productPicks') }}
        </h2>
        <ul class="mt-2 space-y-1 text-sm">
          <li
            v-for="pick in booking.product_picks"
            :key="pick.id"
          >
            {{ pick.sellable_item_name || pick.sellable_item_code || pick.sellable_item_id }}
            — {{ pick.reason }}
          </li>
        </ul>
      </section>

      <section
        v-if="booking.service_record"
        class="mt-4 rounded-xl border border-default bg-default p-4"
      >
        <h2 class="font-semibold text-highlighted">
          {{ $t('expertStation.detail.serviceRecord') }}
        </h2>
        <dl class="mt-2 grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt class="text-muted">
              served_at
            </dt>
            <dd>{{ formatLocalDateTime(booking.service_record.served_at, { style: 'full' }) }}</dd>
          </div>
          <div>
            <dt class="text-muted">
              service_method
            </dt>
            <dd>{{ booking.service_record.service_method }}</dd>
          </div>
          <div class="md:col-span-2">
            <dt class="text-muted">
              content
            </dt>
            <dd>{{ booking.service_record.content }}</dd>
          </div>
          <div class="md:col-span-2">
            <dt class="text-muted">
              sales_content
            </dt>
            <dd>{{ booking.service_record.sales_content }}</dd>
          </div>
          <div
            v-if="booking.service_record.filled_by_operator_id"
            class="md:col-span-2 text-xs text-muted"
          >
            filled_by_operator_id={{ booking.service_record.filled_by_operator_id }}
            · filled_at={{
              booking.service_record.filled_at
                ? formatLocalDateTime(booking.service_record.filled_at, { style: 'list' })
                : '—'
            }}
          </div>
        </dl>
      </section>

      <section class="mt-4 rounded-xl border border-default bg-default p-4">
        <h2 class="font-semibold text-highlighted">
          {{ $t('expertStation.detail.confirmTitle') }}
        </h2>
        <p class="mt-2 text-sm text-muted">
          {{ $t('expertStation.detail.confirmCurrent') }}：
          {{
            booking.confirmed_starts_at
              ? formatLocalDateTime(booking.confirmed_starts_at, { style: 'full' })
              : $t('expertBookings.fields.notConfirmed')
          }}
          <span v-if="booking.confirmed_ends_at">
            – {{ formatLocalDateTime(booking.confirmed_ends_at, { style: 'list' }) }}
          </span>
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
