<script setup lang="ts">
import {
  expertHhmmToMinute,
  expertMinuteToHhmm,
  isSlotAvailable,
  scheduledBookingsForDate,
  weekdayOfDate
} from '~/utils/expert-booking-calendar'
import type {
  ExpertCalendarDayOverride,
  ExpertCalendarExpert,
  ExpertCalendarScheduledBooking,
  ExpertCalendarWeeklySlot
} from '~/utils/expert-booking-types'

const props = defineProps<{
  dates: string[]
  experts: ExpertCalendarExpert[]
  selectedExpertIds: string[]
  weekly: ExpertCalendarWeeklySlot[]
  dayOverrides: ExpertCalendarDayOverride[]
  scheduledBookings: ExpertCalendarScheduledBooking[]
  timeSlots: string[]
  highlightOverrides?: boolean
}>()

const emit = defineEmits<{
  selectBooking: [booking: ExpertCalendarScheduledBooking]
}>()

const expertColorMap = computed(() => {
  const palette = ['#0f766e', '#0369a1', '#a16207', '#be123c', '#7c3aed']
  const map = new Map<string, string>()
  props.experts.forEach((expert, index) => {
    map.set(expert.id, palette[index % palette.length]!)
  })
  return map
})

function dayHasOverride(date: string) {
  if (!props.highlightOverrides) {
    return false
  }
  return props.dayOverrides.some(
    o => o.override_date === date && props.selectedExpertIds.includes(o.expert_operator_id)
  )
}

function availableInAnySelected(date: string, slot: string) {
  return props.selectedExpertIds.some(id => isSlotAvailable(
    id,
    date,
    slot,
    props.weekly,
    props.dayOverrides
  ))
}

function blocksFor(date: string, slot: string) {
  const minute = expertHhmmToMinute(slot)
  return scheduledBookingsForDate(props.scheduledBookings, date)
    .filter((block) => {
      if (!block.confirmed_starts_at) {
        return false
      }
      const startMinute = expertHhmmToMinute(block.confirmed_starts_at.slice(11, 16))
      return startMinute === minute
    })
}

function blockStyle(block: ExpertCalendarScheduledBooking) {
  const start = block.confirmed_starts_at
    ? expertHhmmToMinute(block.confirmed_starts_at.slice(11, 16))
    : 0
  const end = block.confirmed_ends_at
    ? expertHhmmToMinute(block.confirmed_ends_at.slice(11, 16))
    : start + 30
  const span = Math.max(1, Math.round((end - start) / 30))
  const color = expertColorMap.value.get(block.confirmed_by_operator_id || '') || '#64748b'
  return {
    backgroundColor: color,
    gridRow: `span ${span}`
  }
}

function blockTimeLabel(block: ExpertCalendarScheduledBooking) {
  const start = block.confirmed_starts_at?.slice(11, 16) || '—'
  const end = block.confirmed_ends_at?.slice(11, 16) || expertMinuteToHhmm(expertHhmmToMinute(start) + 30)
  return `${start}-${end}`
}

function dayLabel(date: string) {
  return date.slice(5).replace('-', '/')
}
</script>

<template>
  <div
    class="overflow-x-auto bg-default"
    data-testid="expert-station-calendar-grid"
  >
    <div
      class="grid min-w-[720px]"
      :style="{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(0, 1fr))` }"
    >
      <div class="border-b border-default bg-elevated p-2 text-xs text-muted" />
      <div
        v-for="date in dates"
        :key="`h-${date}`"
        class="flex flex-col items-center border-b border-l border-default p-2 text-center text-xs font-medium"
        :class="dayHasOverride(date) ? 'bg-warning/10' : 'bg-elevated'"
      >
        <span class="inline-flex items-center justify-center gap-1">
          {{ $t(`expertStation.calendar.weekdays.${weekdayOfDate(date)}`) }}
          {{ dayLabel(date) }}
        </span>
        <div
          v-if="dayHasOverride(date)"
          class="mt-1 text-[10px] text-warning"
        >
          {{ $t('expertStation.calendar.overrideLegend') }}
        </div>
      </div>

      <template
        v-for="slot in timeSlots"
        :key="slot"
      >
        <div class="border-t border-default px-2 py-3 text-center text-xs text-muted">
          {{ slot }}
        </div>
        <div
          v-for="date in dates"
          :key="`${date}-${slot}`"
          class="relative min-h-10 border-l border-t border-default"
          :class="availableInAnySelected(date, slot) ? 'bg-success/10' : ''"
        >
          <button
            v-for="block in blocksFor(date, slot)"
            :key="block.id"
            type="button"
            class="absolute inset-x-1 top-1 z-10 rounded px-1 py-1 text-left text-[11px] leading-tight text-white shadow-sm"
            :style="blockStyle(block)"
            @click="emit('selectBooking', block)"
          >
            <div>{{ blockTimeLabel(block) }}</div>
            <div class="truncate font-medium">
              {{ block.contact_name || block.id }}
            </div>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
