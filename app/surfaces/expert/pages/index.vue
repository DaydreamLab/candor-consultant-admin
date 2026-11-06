<script setup lang="ts">
import {
  listExpertStationBookings,
  pinExpertStationBooking,
  statusBadgeColor
} from '~/utils/expert-booking-api'
import { preferredSlotsLabel, shortOrderCode } from '~/utils/expert-booking-calendar'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertBookingLastSeen, ExpertBookingListItem } from '~/utils/expert-booking-types'

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
const lastSeen = ref<ExpertBookingLastSeen | null>(null)

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
      { page: page.value, page_size: pageSize }
    )
    rows.value = result.items
    total.value = result.total
    lastSeen.value = result.last_seen
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
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1
    }
    return b.paid_at.localeCompare(a.paid_at)
  })
}

const lastSeenLabel = computed(() => {
  if (!lastSeen.value) {
    return ''
  }
  const code = shortOrderCode(lastSeen.value.order_code)
  const status = t(`expertBookings.status.${lastSeen.value.status}`)
  return `${code} · ${lastSeen.value.member_name} (${status})`
})
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

    <div
      v-if="lastSeen"
      class="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
    >
      <i18n-t
        keypath="expertStation.bookings.lastSeen"
        tag="span"
      >
        <template #label>
          <NuxtLink
            class="font-medium text-primary underline"
            :to="localePath(`/bookings/${encodeURIComponent(lastSeen.booking_id)}`)"
          >
            {{ lastSeenLabel }}
          </NuxtLink>
        </template>
      </i18n-t>
    </div>

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
              {{ $t('expertStation.bookings.columns.order') }}
            </th>
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
            @click="navigateTo(localePath(`/bookings/${encodeURIComponent(row.id)}`))"
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
            <td class="px-3 py-3 font-mono text-xs">
              {{ shortOrderCode(row.order_code) }}
            </td>
            <td class="px-3 py-3 font-medium">
              {{ row.member_name }}
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
                row.confirmed_at
                  ? formatLocalDateTime(row.confirmed_at, { style: 'list' })
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
