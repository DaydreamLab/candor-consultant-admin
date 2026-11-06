<script setup lang="ts">
import {
  appointmentsForDate,
  halfHourSlots,
  isSlotAvailable
} from '~/utils/expert-booking-calendar'
import type {
  ExpertCalendarAppointmentBlock,
  ExpertCalendarExpert,
  ExpertDayAvailabilityOverride,
  ExpertWeeklyAvailabilityRule
} from '~/utils/expert-booking-types'

const props = defineProps<{
  dates: string[]
  experts: ExpertCalendarExpert[]
  selectedExpertIds: string[]
  weeklyRules: ExpertWeeklyAvailabilityRule[]
  dayOverrides: ExpertDayAvailabilityOverride[]
  appointments: ExpertCalendarAppointmentBlock[]
  /** Highlight day columns that have overrides for any selected expert */
  highlightOverrides?: boolean
}>()

const emit = defineEmits<{
  selectAppointment: [block: ExpertCalendarAppointmentBlock]
}>()

const slots = halfHourSlots(9, 18)

function expertColor(expertId: string) {
  return props.experts.find(e => e.id === expertId)?.color || '#64748b'
}

function dayHasOverride(date: string) {
  if (!props.highlightOverrides) {
    return false
  }
  return props.dayOverrides.some(
    o => o.date === date && props.selectedExpertIds.includes(o.expert_id)
  )
}

function availableInAnySelected(date: string, slot: string) {
  return props.selectedExpertIds.some(id => isSlotAvailable(
    id,
    date,
    slot,
    props.weeklyRules,
    props.dayOverrides
  ))
}

function blocksFor(date: string, slot: string) {
  return appointmentsForDate(props.appointments, date, props.selectedExpertIds)
    .filter((block) => {
      const start = block.start_time
      return start === slot
    })
}

function blockStyle(block: ExpertCalendarAppointmentBlock) {
  const start = Number(block.start_time.slice(0, 2)) * 60 + Number(block.start_time.slice(3, 5))
  const end = Number(block.end_time.slice(0, 2)) * 60 + Number(block.end_time.slice(3, 5))
  const span = Math.max(1, Math.round((end - start) / 30))
  return {
    backgroundColor: expertColor(block.expert_id),
    gridRow: `span ${span}`
  }
}

function dayLabel(date: string) {
  return date.slice(5).replace('-', '/')
}
</script>

<template>
  <div
    class="overflow-x-auto rounded-xl border border-default bg-default"
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
        class="border-b border-l border-default p-2 text-center text-xs font-medium"
        :class="dayHasOverride(date) ? 'bg-warning/10' : 'bg-elevated'"
      >
        {{ dayLabel(date) }}
        <div
          v-if="dayHasOverride(date)"
          class="mt-1 text-[10px] text-warning"
        >
          {{ $t('expertStation.calendar.overrideLegend') }}
        </div>
      </div>

      <template
        v-for="slot in slots"
        :key="slot"
      >
        <div class="border-t border-default px-2 py-3 text-xs text-muted">
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
            :key="`${block.booking_id}-${block.start_time}`"
            type="button"
            class="absolute inset-x-1 top-1 z-10 rounded px-1 py-1 text-left text-[11px] leading-tight text-white shadow-sm"
            :style="blockStyle(block)"
            @click="emit('selectAppointment', block)"
          >
            <div>{{ block.start_time }}-{{ block.end_time }}</div>
            <div class="truncate font-medium">
              {{ block.member_name }}
            </div>
            <div class="truncate opacity-90">
              {{ block.expert_name }}
            </div>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
