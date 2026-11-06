<script setup lang="ts">
import {
  getAdminExpertBooking,
  listExpertStationBookings,
  pinExpertStationBooking,
  statusBadgeColor
} from '~/utils/expert-booking-api'
import { preferredSlotsLabel } from '~/utils/expert-booking-calendar'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertBookingListItem, ExpertBookingStatus } from '~/utils/expert-booking-types'

definePageMeta({
  layout: 'expert',
  name: 'expert-station-bookings',
  path: '/expert/bookings'
})

const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const page = ref(1)
const pageSize = 10
const pending = ref(true)
const errorMessage = ref('')
const rows = ref<ExpertBookingListItem[]>([])
const total = ref(0)
const lastSeen = ref<{
  id: string
  contactName: string
  status: ExpertBookingStatus | null
  confirmedStartsAt: string | null
  confirmedEndsAt: string | null
} | null>(null)

function confirmedSlotLabel(starts: string | null, ends: string | null): string {
  if (!starts) {
    return '—'
  }
  const start = formatLocalDateTime(starts, { style: 'list' })
  if (!ends) {
    return start
  }
  const end = formatLocalDateTime(ends, { style: 'list' })
  if (start.slice(0, 5) === end.slice(0, 5)) {
    return `${start}–${end.slice(6)}`
  }
  return `${start}–${end}`
}

const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const expertId = computed(() => session.operator?.id || 'op-expert-wang')

watch(page, () => {
  void load()
})

onMounted(() => {
  void load()
})

async function load() {
  pending.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const result = await listExpertStationBookings(
      config.public.apiBase,
      token,
      expertId.value,
      { limit: pageSize, offset: (page.value - 1) * pageSize }
    )
    rows.value = result.expert_bookings
    total.value = result.total
    if (result.last_seen_booking_id) {
      try {
        const seen = await getAdminExpertBooking(
          config.public.apiBase,
          token,
          result.last_seen_booking_id
        )
        lastSeen.value = {
          id: result.last_seen_booking_id,
          contactName: seen.contact_name,
          status: seen.status,
          confirmedStartsAt: seen.confirmed_starts_at,
          confirmedEndsAt: seen.confirmed_ends_at
        }
      } catch {
        lastSeen.value = {
          id: result.last_seen_booking_id,
          contactName: result.last_seen_booking_id,
          status: null,
          confirmedStartsAt: null,
          confirmedEndsAt: null
        }
      }
    } else {
      lastSeen.value = null
    }
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    pending.value = false
  }
}

async function togglePin(row: ExpertBookingListItem) {
  const token = readOperatorToken()
  if (!token) {
    return
  }
  const next = !row.pinned
  await pinExpertStationBooking(
    config.public.apiBase,
    token,
    expertId.value,
    row.id,
    next
  )
  row.pinned = next
  rows.value = [...rows.value].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1
    }
    return (b.paid_at || '').localeCompare(a.paid_at || '')
  })
}
</script>

<template>
  <div data-testid="expert-station-bookings">
    <p class="text-sm text-muted">
      {{ $t('expertStation.bookings.crumb') }}
    </p>
    <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('expertStation.bookings.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ $t('expertStation.bookings.description') }}
        </p>
      </div>
      <p class="text-sm text-muted">
        {{
          $t('expertStation.bookings.page', {
            page,
            pages,
            total
          })
        }}
      </p>
    </div>

    <NuxtLink
      v-if="lastSeen"
      class="mt-4 block max-w-sm rounded-xl border border-default bg-default px-4 py-4 hover:bg-elevated/60"
      :to="localePath(`/expert/bookings/${encodeURIComponent(lastSeen.id)}`)"
    >
      <h2 class="text-sm text-muted">
        {{ $t('expertStation.bookings.lastSeen') }}
      </h2>
      <p class="mt-2 truncate text-2xl font-semibold text-highlighted">
        {{ lastSeen.contactName }}
      </p>
      <p class="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span class="text-muted">{{ $t('expertStation.bookings.confirmedSlot') }}</span>
        <span class="text-default">
          {{ confirmedSlotLabel(lastSeen.confirmedStartsAt, lastSeen.confirmedEndsAt) }}
        </span>
        <UBadge
          v-if="lastSeen.status"
          :color="statusBadgeColor(lastSeen.status)"
          variant="subtle"
        >
          {{ $t(`expertBookings.status.${lastSeen.status}`) }}
        </UBadge>
      </p>
    </NuxtLink>

    <p
      v-if="pending"
      class="mt-6 text-sm text-muted"
    >
      {{ $t('expertBookings.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="mt-6 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <div
      v-else
      class="mt-4 overflow-x-auto rounded-xl border border-default bg-default"
    >
      <table class="min-w-full text-sm">
        <thead class="bg-elevated text-left text-muted">
          <tr>
            <th class="px-3 py-3" />
            <th class="px-3 py-3">
              {{ $t('expertStation.bookings.columns.member') }}
            </th>
            <th class="px-3 py-3">
              {{ $t('expertStation.bookings.columns.preferred') }}
            </th>
            <th class="px-3 py-3">
              {{ $t('expertStation.bookings.columns.status') }}
            </th>
            <th class="px-3 py-3">
              {{ $t('expertStation.bookings.columns.confirmed') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="cursor-pointer border-t border-default hover:bg-elevated/60"
            @click="navigateTo(localePath(`/expert/bookings/${encodeURIComponent(row.id)}`))"
          >
            <td class="px-3 py-3">
              <UButton
                size="xs"
                :variant="row.pinned ? 'soft' : 'ghost'"
                :color="row.pinned ? 'error' : 'neutral'"
                icon="i-lucide-pin"
                :title="row.pinned ? $t('expertStation.bookings.unpin') : $t('expertStation.bookings.pin')"
                @click.stop="togglePin(row)"
              />
            </td>
            <td class="px-3 py-3 font-medium">
              {{ row.contact_name }}
            </td>
            <td class="px-3 py-3 text-muted">
              {{ preferredSlotsLabel(row.preferred_slots) }}
            </td>
            <td class="px-3 py-3">
              <UBadge
                :color="statusBadgeColor(row.status)"
                variant="subtle"
              >
                {{ $t(`expertBookings.status.${row.status}`) }}
              </UBadge>
            </td>
            <td class="px-3 py-3">
              {{
                row.confirmed_starts_at
                  ? formatLocalDateTime(row.confirmed_starts_at, { style: 'list' })
                  : '—'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <UButton
        variant="outline"
        :disabled="page <= 1"
        @click="page -= 1"
      >
        {{ $t('expertStation.bookings.prev') }}
      </UButton>
      <UButton
        variant="outline"
        :disabled="page >= pages"
        @click="page += 1"
      >
        {{ $t('expertStation.bookings.next') }}
      </UButton>
    </div>
  </div>
</template>
