<script setup lang="ts">
import { getExpertCalendar, listExpertStationBookings } from '~/utils/expert-booking-api'
import {
  expertAddDaysToDateString,
  expertCalendarOverview,
  expertWeekDates,
  expertWeekStartMonday,
  weekdayOfDate
} from '~/utils/expert-booking-calendar'
import { readOperatorToken } from '~/utils/operator-session'
import type {
  ExpertCalendarScheduledBooking,
  ExpertCalendarSnapshot
} from '~/utils/expert-booking-types'

const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()
const { start: windowStart, end: windowEnd, slots, startItems, endItems } = useExpertWorkWindow()

const view = ref<'week' | 'day'>('week')
const anchor = ref(expertWeekStartMonday('2026-04-10'))
const pending = ref(true)
const errorMessage = ref('')
const snapshot = ref<ExpertCalendarSnapshot | null>(null)
const awaitingCount = ref<number | null>(null)
const selectedExpertIds = ref<string[]>([])
const selectedBooking = ref<ExpertCalendarScheduledBooking | null>(null)

const weekStart = computed(() => expertWeekStartMonday(anchor.value))
const dates = computed(() => {
  if (view.value === 'day') {
    return [anchor.value]
  }
  return expertWeekDates(weekStart.value)
})

function formatRangeEndpoint(isoDate: string, withYear: boolean) {
  const weekday = t(`expertStation.calendar.weekdays.${weekdayOfDate(isoDate)}`)
  const body = withYear
    ? isoDate.replaceAll('-', ' / ')
    : isoDate.slice(5).replace('-', ' / ')
  return `${weekday} ${body}`
}

const rangeLabel = computed(() => {
  if (view.value === 'day') {
    return formatRangeEndpoint(anchor.value, true)
  }
  const end = expertAddDaysToDateString(weekStart.value, 6)
  return `${formatRangeEndpoint(weekStart.value, true)} - ${formatRangeEndpoint(end, false)}`
})

const overview = computed(() => {
  if (!snapshot.value) {
    return null
  }
  return expertCalendarOverview({
    dates: dates.value,
    slots: slots.value,
    scheduledBookings: snapshot.value.scheduled_bookings
  })
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
    const [data, awaiting] = await Promise.all([
      getExpertCalendar(config.public.apiBase, token, {
        from: dates.value[0]!,
        to: dates.value[dates.value.length - 1]!
      }),
      listExpertStationBookings(
        config.public.apiBase,
        token,
        session.operator?.id || '',
        { status: 'awaiting_schedule', limit: 1 }
      ).catch(() => null)
    ])
    snapshot.value = data
    awaitingCount.value = awaiting?.total ?? null
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

const allExpertsSelected = computed(() => {
  const experts = snapshot.value?.experts || []
  return experts.length > 0 && experts.every(expert => selectedExpertIds.value.includes(expert.id))
})

const expertSelection = computed<boolean | 'indeterminate'>(() => {
  const experts = snapshot.value?.experts || []
  const selectedCount = experts.filter(expert => selectedExpertIds.value.includes(expert.id)).length
  if (selectedCount === 0) {
    return false
  }
  if (selectedCount === experts.length) {
    return true
  }
  return 'indeterminate'
})

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

function toggleAllExperts(checked: boolean | 'indeterminate') {
  const experts = snapshot.value?.experts || []
  if (checked === true) {
    selectedExpertIds.value = experts.map(expert => expert.id)
    return
  }
  selectedExpertIds.value = []
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
    <h1 class="mt-4 text-2xl font-semibold text-highlighted">
      {{ $t('expertStation.calendar.title') }}
    </h1>

    <section
      v-if="snapshot && !errorMessage && overview"
      class="mt-4"
      data-testid="expert-station-calendar-overview"
    >
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article class="rounded-xl border border-default bg-default px-4 py-4">
          <h2 class="text-sm text-muted">
            {{ $t('expertStation.calendar.overviewAwaiting') }}
          </h2>
          <p class="mt-2 text-3xl font-semibold tabular-nums text-highlighted">
            {{ awaitingCount ?? '—' }}
          </p>
        </article>
        <article class="rounded-xl border border-default bg-default px-4 py-4">
          <h2 class="text-sm text-muted">
            {{ $t('expertStation.calendar.overviewBookings') }}
          </h2>
          <p class="mt-2 text-3xl font-semibold tabular-nums text-highlighted">
            {{ overview.bookings }}
          </p>
        </article>
      </div>
    </section>

    <div class="mt-4 overflow-hidden rounded-xl border border-default bg-default">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-default px-4 py-3">
        <div class="inline-flex items-center gap-2">
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
          <span class="inline-flex items-center gap-1 whitespace-nowrap text-sm text-muted">
            {{ rangeLabel }}
          </span>
        </div>
        <div class="inline-flex items-center gap-2">
          <span class="text-sm text-muted">
            {{ $t('expertStation.calendar.windowStart') }}
          </span>
          <USelect
            v-model="windowStart"
            :items="startItems"
            size="sm"
            class="w-28"
          />
        </div>
        <div class="inline-flex items-center gap-2">
          <span class="text-sm text-muted">
            {{ $t('expertStation.calendar.windowEnd') }}
          </span>
          <USelect
            v-model="windowEnd"
            :items="endItems"
            size="sm"
            class="w-28"
          />
        </div>
        <div class="ml-auto inline-flex rounded-lg border border-default p-0.5">
          <UButton
            size="sm"
            :variant="view === 'week' ? 'solid' : 'ghost'"
            @click="view = 'week'"
          >
            {{ $t('expertStation.calendar.week') }}
          </UButton>
          <UButton
            size="sm"
            :variant="view === 'day' ? 'solid' : 'ghost'"
            @click="view = 'day'"
          >
            {{ $t('expertStation.calendar.day') }}
          </UButton>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 border-b border-default px-4 py-2">
        <span class="inline-flex items-center gap-2 text-sm leading-none text-muted">
          <span class="inline-block size-2.5 shrink-0 rounded-sm bg-success/30" />
          {{ $t('expertStation.calendar.available') }}
        </span>
        <UButton
          size="sm"
          variant="outline"
          :to="localePath('/calendar/availability')"
        >
          {{ $t('expertStation.calendar.setAvailability') }}
        </UButton>
      </div>

      <div class="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside
          v-if="snapshot"
          class="relative min-h-0 border-b border-default lg:border-b-0 lg:border-r"
        >
          <div class="flex max-h-80 flex-col lg:absolute lg:inset-0 lg:max-h-none">
            <h2 class="shrink-0 px-4 pt-3 text-sm text-muted">
              {{ $t('expertStation.calendar.experts') }}
            </h2>
            <label class="flex shrink-0 items-center gap-2 border-b border-default px-4 py-2 text-sm">
              <UCheckbox
                :model-value="expertSelection"
                @update:model-value="toggleAllExperts"
              />
              {{ allExpertsSelected ? $t('expertStation.calendar.clearAll') : $t('expertStation.calendar.selectAll') }}
            </label>
            <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              <label
                v-for="expert in snapshot.experts"
                :key="expert.id"
                class="flex items-center gap-2 py-1.5 text-sm"
              >
                <UCheckbox
                  :model-value="selectedExpertIds.includes(expert.id)"
                  @update:model-value="toggleExpert(expert.id, $event)"
                />
                <span
                  class="inline-block size-2.5 shrink-0 rounded-sm"
                  :style="{ backgroundColor: expertColorMap.get(expert.id) }"
                />
                <span class="min-w-0 truncate">
                  {{ expert.name || expert.email || expert.id }}
                </span>
              </label>
            </div>
          </div>
        </aside>

        <div class="min-w-0">
          <p
            v-if="pending"
            class="px-4 py-6 text-sm text-muted"
          >
            {{ $t('expertBookings.loading') }}
          </p>
          <p
            v-else-if="errorMessage"
            class="px-4 py-6 text-sm text-error"
          >
            {{ errorMessage }}
          </p>
          <ExpertStationCalendarGrid
            v-else-if="snapshot"
            :dates="dates"
            :experts="snapshot.experts"
            :selected-expert-ids="selectedExpertIds"
            :weekly="snapshot.weekly"
            :day-overrides="snapshot.day_overrides"
            :scheduled-bookings="snapshot.scheduled_bookings"
            :time-slots="slots"
            highlight-overrides
            @select-booking="selectedBooking = $event"
          />
        </div>
      </div>
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
