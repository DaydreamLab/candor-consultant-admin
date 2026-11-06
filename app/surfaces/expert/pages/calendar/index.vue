<script setup lang="ts">
import { getExpertCalendar } from '~/utils/expert-booking-api'
import {
  expertAddDaysToDateString,
  expertWeekDates,
  expertWeekStartMonday
} from '~/utils/expert-booking-calendar'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { readOperatorToken } from '~/utils/operator-session'
import type {
  ExpertCalendarAppointmentBlock,
  ExpertCalendarSnapshot
} from '~/utils/expert-booking-types'

const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()

const view = ref<'week' | 'day'>('week')
const anchor = ref(expertWeekStartMonday('2026-11-12'))
const pending = ref(true)
const errorMessage = ref('')
const snapshot = ref<ExpertCalendarSnapshot | null>(null)
const selectedExpertIds = ref<string[]>([])
const selectedAppointment = ref<ExpertCalendarAppointmentBlock | null>(null)

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
  anchor.value = '2026-11-12'
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
          :style="{ backgroundColor: expert.color }"
        />
        {{ expert.name }}
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
        :weekly-rules="snapshot.weekly_rules"
        :day-overrides="snapshot.day_overrides"
        :appointments="snapshot.appointments"
        @select-appointment="selectedAppointment = $event"
      />
    </div>

    <UModal
      :open="Boolean(selectedAppointment)"
      @update:open="(open) => { if (!open) selectedAppointment = null }"
    >
      <template #content>
        <div
          v-if="selectedAppointment"
          class="space-y-3 p-5"
        >
          <h2 class="text-lg font-semibold">
            {{ selectedAppointment.member_name }}
          </h2>
          <p class="text-sm text-muted">
            {{ selectedAppointment.date }}
            {{ selectedAppointment.start_time }}-{{ selectedAppointment.end_time }}
            · {{ selectedAppointment.expert_name }}
          </p>
          <UButton
            color="primary"
            :to="localePath(`/bookings/${encodeURIComponent(selectedAppointment.booking_id)}`)"
          >
            {{ $t('expertBookings.details') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <p
      v-if="snapshot?.last_modified_at"
      class="mt-3 text-xs text-muted"
    >
      {{
        $t('expertStation.calendar.lastModified', {
          name: snapshot.last_modified_by_name || '—',
          at: formatLocalDateTime(snapshot.last_modified_at, { style: 'list' })
        })
      }}
    </p>
  </div>
</template>
