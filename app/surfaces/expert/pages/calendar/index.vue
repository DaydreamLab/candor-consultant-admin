<script setup lang="ts">
import { getExpertCalendar } from '~/utils/expert-booking-api'
import {
  expertAddDaysToDateString,
  expertWeekDates,
  expertWeekStartMonday
} from '~/utils/expert-booking-calendar'
import { readOperatorToken } from '~/utils/operator-session'
import type {
  ExpertCalendarScheduledBooking,
  ExpertCalendarSnapshot
} from '~/utils/expert-booking-types'

const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()

const view = ref<'week' | 'day'>('week')
const anchor = ref(expertWeekStartMonday('2026-04-10'))
const pending = ref(true)
const errorMessage = ref('')
const snapshot = ref<ExpertCalendarSnapshot | null>(null)
const selectedExpertIds = ref<string[]>([])
const selectedBooking = ref<ExpertCalendarScheduledBooking | null>(null)

const weekStart = computed(() => expertWeekStartMonday(anchor.value))
const dates = computed(() => {
  if (view.value === 'day') {
    return [anchor.value]
  }
  return expertWeekDates(weekStart.value)
})

const rangeLabel = computed(() => {
  if (view.value === 'day') {
    return anchor.value.replaceAll('-', ' / ')
  }
  const end = expertAddDaysToDateString(weekStart.value, 6)
  return `${weekStart.value.replaceAll('-', ' / ')} - ${end.slice(5).replace('-', ' / ')}`
})

const expertColorMap = computed(() => {
  const palette = ['#0f766e', '#0369a1', '#a16207', '#be123c', '#7c3aed']
  const map = new Map<string, string>()
  ;(snapshot.value?.experts || []).forEach((expert, index) => {
    map.set(expert.id, palette[index % palette.length]!)
  })
  return map
})

watch(dates, () => {
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
    const data = await getExpertCalendar(config.public.apiBase, token, {
      from: dates.value[0]!,
      to: dates.value[dates.value.length - 1]!
    })
    snapshot.value = data
    if (!selectedExpertIds.value.length) {
      selectedExpertIds.value = data.experts.map(e => e.id)
    }
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    pending.value = false
  }
}

function shift(delta: number) {
  const step = view.value === 'day' ? 1 : 7
  anchor.value = expertAddDaysToDateString(anchor.value, delta * step)
}

function goToday() {
  anchor.value = '2026-04-10'
}

function toggleExpert(id: string, checked: boolean | 'indeterminate') {
  const on = checked === true
  if (on) {
    if (!selectedExpertIds.value.includes(id)) {
      selectedExpertIds.value = [...selectedExpertIds.value, id]
    }
    return
  }
  selectedExpertIds.value = selectedExpertIds.value.filter(x => x !== id)
}
</script>

<template>
  <div data-testid="expert-station-calendar">
    <p class="text-sm text-muted">
      {{
        view === 'day'
          ? $t('expertStation.calendar.crumbDay')
          : $t('expertStation.calendar.crumb')
      }}
    </p>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('expertStation.calendar.title') }}
      </h1>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          size="sm"
          variant="outline"
          @click="shift(-1)"
        >
          {{ view === 'day' ? $t('expertStation.calendar.prevDay') : $t('expertStation.calendar.prevWeek') }}
        </UButton>
        <UButton
          size="sm"
          variant="soft"
          @click="goToday"
        >
          {{ $t('expertStation.calendar.today') }}
        </UButton>
        <UButton
          size="sm"
          variant="outline"
          @click="shift(1)"
        >
          {{ view === 'day' ? $t('expertStation.calendar.nextDay') : $t('expertStation.calendar.nextWeek') }}
        </UButton>
        <span class="text-sm text-muted">
          {{ rangeLabel }}
        </span>
        <div class="inline-flex rounded-lg border border-default p-0.5">
          <UButton
            size="xs"
            :variant="view === 'week' ? 'solid' : 'ghost'"
            @click="view = 'week'"
          >
            {{ $t('expertStation.calendar.week') }}
          </UButton>
          <UButton
            size="xs"
            :variant="view === 'day' ? 'solid' : 'ghost'"
            @click="view = 'day'"
          >
            {{ $t('expertStation.calendar.day') }}
          </UButton>
        </div>
      </div>
      <div class="ml-auto">
        <UButton
          variant="outline"
          :to="localePath('/calendar/availability')"
        >
          {{ $t('expertStation.calendar.setAvailability') }}
        </UButton>
      </div>
    </div>

    <div
      v-if="snapshot"
      class="mt-4 flex flex-wrap items-center gap-4 text-sm"
    >
      <span class="text-muted">
        {{ $t('expertStation.calendar.experts') }}
      </span>
      <label
        v-for="expert in snapshot.experts"
        :key="expert.id"
        class="inline-flex items-center gap-2"
      >
        <UCheckbox
          :model-value="selectedExpertIds.includes(expert.id)"
          @update:model-value="toggleExpert(expert.id, $event)"
        />
        <span
          class="inline-block size-2.5 rounded-sm"
          :style="{ backgroundColor: expertColorMap.get(expert.id) }"
        />
        {{ expert.name || expert.email || expert.id }}
      </label>
      <span class="inline-flex items-center gap-2 text-muted">
        <span class="inline-block size-3 rounded-sm bg-success/30" />
        {{ $t('expertStation.calendar.available') }}
      </span>
      <span class="text-xs text-muted">
        {{ $t('expertStation.calendar.noGoogle') }}
      </span>
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
      v-else-if="snapshot"
      class="mt-4"
    >
      <ExpertStationCalendarGrid
        :dates="dates"
        :experts="snapshot.experts"
        :selected-expert-ids="selectedExpertIds"
        :weekly="snapshot.weekly"
        :day-overrides="snapshot.day_overrides"
        :scheduled-bookings="snapshot.scheduled_bookings"
        highlight-overrides
        @select-booking="selectedBooking = $event"
      />
    </div>

    <UModal
      :open="Boolean(selectedBooking)"
      @update:open="(open) => { if (!open) selectedBooking = null }"
    >
      <template #content>
        <div
          v-if="selectedBooking"
          class="space-y-3 p-5"
        >
          <h2 class="text-lg font-semibold">
            {{ selectedBooking.contact_name || selectedBooking.id }}
          </h2>
          <p class="text-sm text-muted">
            {{ selectedBooking.confirmed_starts_at }}
            <span v-if="selectedBooking.confirmed_ends_at">
              – {{ selectedBooking.confirmed_ends_at }}
            </span>
          </p>
          <UButton
            color="primary"
            :to="localePath(`/bookings/${encodeURIComponent(selectedBooking.id)}`)"
          >
            {{ $t('expertBookings.details') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
