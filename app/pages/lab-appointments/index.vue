<script setup lang="ts">
import { money } from '~/utils/format'
import {
  addDaysToDateString,
  weekDates,
  weekStartMonday,
  type LabAppointmentMock
} from '~/utils/lab-service-mock'

const localePath = useLocalePath()
const { t, locale } = useI18n()
const store = useLabServiceMockStore()

const appointments = computed(() => store.listAppointments())

const calendarOpen = ref(false)
const weekStart = ref(weekStartMonday())

const todayText = computed(() => {
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const weekRangeLabel = computed(() => {
  const start = weekStart.value
  const end = addDaysToDateString(start, 6)
  return t('labAppointments.calendar.weekRange', { start, end })
})

const calendarDays = computed(() => {
  return weekDates(weekStart.value).map((date, index) => {
    const weekday = (index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7
    const rows = appointments.value
      .filter(row => row.appointment_date === date)
      .slice()
      .sort((a, b) => a.window_start.localeCompare(b.window_start) || a.id.localeCompare(b.id))
    return {
      date,
      weekday,
      isToday: date === todayText.value,
      rows
    }
  })
})

watch(calendarOpen, (open) => {
  if (open) {
    weekStart.value = weekStartMonday()
  }
})

function openCalendar() {
  calendarOpen.value = true
}

function shiftWeek(delta: number) {
  weekStart.value = addDaysToDateString(weekStart.value, delta * 7)
}

function goThisWeek() {
  weekStart.value = weekStartMonday()
}

function openRow(row: LabAppointmentMock) {
  calendarOpen.value = false
  void navigateTo(localePath(`/lab-appointments/${encodeURIComponent(row.id)}`))
}

function serviceName(row: LabAppointmentMock) {
  return String(locale.value).startsWith('en')
    ? (row.lab_service_name_en || row.lab_service_name_zh)
    : (row.lab_service_name_zh || row.lab_service_name_en)
}

function statusLabel(row: LabAppointmentMock) {
  return t(`labAppointments.status.${row.status}`)
}

function slotText(row: LabAppointmentMock) {
  return `${row.appointment_date} ${row.window_start}–${row.window_end}`
}

function dayLabel(date: string) {
  return date.slice(5).replace('-', '/')
}

function weekdayLabel(weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7) {
  return t(`labServices.weekdays.${weekday}`)
}
</script>

<template>
  <PageHeader
    :title="$t('nav.labAppointments')"
    :description="$t('labAppointments.description')"
    plain
  >
    <div class="mb-4 flex justify-end">
      <UButton
        icon="i-lucide-calendar-days"
        color="neutral"
        variant="subtle"
        @click="openCalendar"
      >
        {{ $t('labAppointments.calendar.open') }}
      </UButton>
    </div>

    <p
      v-if="!appointments.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('labAppointments.empty') }}
    </p>
    <div
      v-else
      class="overflow-hidden rounded-xl border border-default bg-elevated"
    >
      <table class="w-full text-left text-sm">
        <thead class="border-b border-default bg-muted/40 text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('labAppointments.columns.member') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('labAppointments.columns.service') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('labAppointments.columns.slot') }}
            </th>
            <th class="px-4 py-3 font-medium text-right">
              {{ $t('labAppointments.columns.amount') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('labAppointments.columns.status') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in appointments"
            :key="row.id"
            class="cursor-pointer border-b border-default last:border-b-0 hover:bg-elevated"
            @click="openRow(row)"
          >
            <td class="px-4 py-3">
              <p class="font-medium text-highlighted">
                {{ row.user_display_name }}
              </p>
              <p class="text-xs text-muted">
                {{ row.user_email }}
              </p>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium text-highlighted">
                {{ serviceName(row) }}
              </p>
              <p class="text-xs text-muted">
                {{ row.partner_name }}
              </p>
            </td>
            <td class="px-4 py-3 text-highlighted">
              {{ slotText(row) }}
            </td>
            <td class="tabular-money px-4 py-3 text-right font-medium text-highlighted">
              {{ money(row.amount_total) }}
            </td>
            <td class="px-4 py-3">
              <UBadge
                :color="row.status === 'booked' ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ statusLabel(row) }}
              </UBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal
      v-model:open="calendarOpen"
      :title="$t('labAppointments.calendar.title')"
      :description="weekRangeLabel"
      :ui="{ content: 'sm:max-w-6xl' }"
    >
      <template #body>
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="$t('labAppointments.calendar.prevWeek')"
              @click="shiftWeek(-1)"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              @click="goThisWeek"
            >
              {{ $t('labAppointments.calendar.thisWeek') }}
            </UButton>
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="$t('labAppointments.calendar.nextWeek')"
              @click="shiftWeek(1)"
            />
          </div>
          <p class="text-sm text-muted">
            {{ weekRangeLabel }}
          </p>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          <section
            v-for="day in calendarDays"
            :key="day.date"
            class="flex h-80 flex-col rounded-lg border border-default bg-elevated/40 p-2"
            :class="day.isToday ? 'ring-1 ring-primary/40' : ''"
          >
            <header class="mb-2 flex shrink-0 items-baseline justify-between gap-1 border-b border-default pb-1.5">
              <div>
                <p class="text-xs font-medium text-muted">
                  {{ weekdayLabel(day.weekday) }}
                </p>
                <p
                  class="text-sm font-semibold"
                  :class="day.isToday ? 'text-primary' : 'text-highlighted'"
                >
                  {{ dayLabel(day.date) }}
                </p>
              </div>
              <span class="text-xs text-dimmed">
                {{ day.rows.length }}
              </span>
            </header>

            <ul
              v-if="day.rows.length"
              class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
            >
              <li
                v-for="row in day.rows"
                :key="row.id"
              >
                <button
                  type="button"
                  class="w-full rounded-md border border-default px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
                  :class="row.status === 'cancelled' ? 'opacity-60' : ''"
                  @click="openRow(row)"
                >
                  <p class="text-xs font-medium text-highlighted">
                    {{ row.window_start }}–{{ row.window_end }}
                  </p>
                  <p class="truncate text-xs text-highlighted">
                    {{ row.user_display_name }}
                  </p>
                  <p class="truncate text-[11px] text-muted">
                    {{ serviceName(row) }}
                  </p>
                  <UBadge
                    class="mt-1"
                    size="sm"
                    :color="row.status === 'booked' ? 'success' : 'neutral'"
                    variant="subtle"
                  >
                    {{ statusLabel(row) }}
                  </UBadge>
                </button>
              </li>
            </ul>
            <p
              v-else
              class="flex flex-1 items-center justify-center text-xs text-dimmed"
            >
              {{ $t('labAppointments.calendar.dayEmpty') }}
            </p>
          </section>
        </div>
      </template>
    </UModal>
  </PageHeader>
</template>
