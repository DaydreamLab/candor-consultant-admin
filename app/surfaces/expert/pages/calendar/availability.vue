<script setup lang="ts">
import {
  deleteExpertCalendarDayOverride,
  getExpertCalendar,
  putExpertCalendarDayOverride,
  putExpertCalendarWeekly
} from '~/utils/expert-booking-api'
import {
  dragSelectSlotMinutes,
  effectiveSlotsForDate,
  expertHhmmToMinute,
  expertMinuteToHhmm,
  expertWeekDates,
  expertWeekStartMonday,
  halfHourSlots,
  weekdayOfDate
} from '~/utils/expert-booking-calendar'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertCalendarSnapshot } from '~/utils/expert-booking-types'

const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const weekStart = ref(expertWeekStartMonday('2026-04-10'))
const dates = computed(() => expertWeekDates(weekStart.value))
const slots = halfHourSlots(9, 18)
const snapshot = ref<ExpertCalendarSnapshot | null>(null)
const expertId = ref('')
const weeklyRepeat = ref(true)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const selectedOverrideDate = ref<string | null>('2026-04-10')

const dragDay = ref<string | null>(null)
const dragMinutes = ref<number[]>([])
const dragStart = ref<string | null>(null)

const expertItems = computed(() =>
  (snapshot.value?.experts || []).map(e => ({
    label: e.name || e.email || e.id,
    value: e.id
  }))
)

const override = computed(() => {
  if (!snapshot.value || !selectedOverrideDate.value || !expertId.value) {
    return null
  }
  return snapshot.value.day_overrides.find(
    o => o.expert_operator_id === expertId.value && o.override_date === selectedOverrideDate.value
  ) || null
})

const weeklyTemplateLabel = computed(() => {
  if (!selectedOverrideDate.value || !snapshot.value || !expertId.value) {
    return '—'
  }
  const weekday = weekdayOfDate(selectedOverrideDate.value)
  const minutes = snapshot.value.weekly
    .filter(r => r.expert_operator_id === expertId.value && r.weekday === weekday)
    .map(r => r.slot_start_minute)
    .sort((a, b) => a - b)
  if (!minutes.length) {
    return '—'
  }
  return minutes.map(expertMinuteToHhmm).join('；')
})

const actualTodayLabel = computed(() => {
  if (!override.value?.slots.length) {
    return '—'
  }
  return [...override.value.slots].sort((a, b) => a - b).map(expertMinuteToHhmm).join('；')
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
    if (!expertId.value) {
      expertId.value = session.operator?.id && data.experts.some(e => e.id === session.operator?.id)
        ? session.operator.id
        : (data.experts[0]?.id || '')
    }
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    pending.value = false
  }
}

function cellActive(date: string, slot: string) {
  if (!snapshot.value || !expertId.value) {
    return false
  }
  const minute = expertHhmmToMinute(slot)
  if (dragDay.value === date && dragMinutes.value.includes(minute)) {
    return true
  }
  return effectiveSlotsForDate(
    expertId.value,
    date,
    snapshot.value.weekly,
    snapshot.value.day_overrides
  ).slots.includes(minute)
}

function cellIsOverride(date: string) {
  return Boolean(
    snapshot.value?.day_overrides.some(
      o => o.expert_operator_id === expertId.value && o.override_date === date
    )
  )
}

function onPointerDown(date: string, slot: string, event: PointerEvent) {
  event.preventDefault()
  dragDay.value = date
  dragStart.value = slot
  dragMinutes.value = [expertHhmmToMinute(slot)]
  selectedOverrideDate.value = date
}

function onPointerEnter(date: string, slot: string) {
  if (!dragDay.value || !dragStart.value) {
    return
  }
  if (date !== dragDay.value) {
    return
  }
  dragMinutes.value = dragSelectSlotMinutes(dragStart.value, slot)
}

async function refreshSnapshot() {
  const token = readOperatorToken()
  if (!token) {
    return
  }
  snapshot.value = await getExpertCalendar(config.public.apiBase, token, {
    from: dates.value[0]!,
    to: dates.value[dates.value.length - 1]!,
    expert_operator_id: expertId.value || null
  })
}

async function onPointerUp() {
  if (!dragDay.value || !dragMinutes.value.length || !snapshot.value || !expertId.value) {
    dragDay.value = null
    dragStart.value = null
    dragMinutes.value = []
    return
  }
  const date = dragDay.value
  const token = readOperatorToken()
  if (!token) {
    return
  }

  try {
    if (weeklyRepeat.value) {
      const weekday = weekdayOfDate(date)
      const kept = snapshot.value.weekly.filter(
        r => !(r.expert_operator_id === expertId.value && r.weekday === weekday)
      )
      const nextSlots = [
        ...kept
          .filter(r => r.expert_operator_id === expertId.value)
          .map(r => ({ weekday: r.weekday, slot_start_minute: r.slot_start_minute })),
        ...dragMinutes.value.map(slot_start_minute => ({ weekday, slot_start_minute }))
      ]
      await putExpertCalendarWeekly(config.public.apiBase, token, {
        expert_operator_id: expertId.value,
        slots: nextSlots
      })
    } else {
      await putExpertCalendarDayOverride(config.public.apiBase, token, {
        expert_operator_id: expertId.value,
        override_date: date,
        slots: [...dragMinutes.value]
      })
    }
    await refreshSnapshot()
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    dragDay.value = null
    dragStart.value = null
    dragMinutes.value = []
  }
}

async function restoreWeekly() {
  if (!selectedOverrideDate.value || !expertId.value) {
    return
  }
  const token = readOperatorToken()
  if (!token) {
    return
  }
  saving.value = true
  try {
    await deleteExpertCalendarDayOverride(config.public.apiBase, token, {
      expert_operator_id: expertId.value,
      override_date: selectedOverrideDate.value
    })
    await refreshSnapshot()
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    saving.value = false
  }
}

function dayLabel(date: string) {
  return date.slice(5).replace('-', '/')
}
</script>

<template>
  <div
    data-testid="expert-station-availability"
    @pointerup="onPointerUp"
  >
    <p class="text-sm text-muted">
      {{ $t('expertStation.calendar.availabilityCrumb') }}
    </p>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('expertStation.calendar.availabilityTitle') }}
      </h1>
      <UFormField :label="$t('expertStation.calendar.expert')">
        <USelect
          v-model="expertId"
          :items="expertItems"
          class="min-w-40"
        />
      </UFormField>
      <label class="inline-flex items-center gap-2 text-sm">
        <USwitch v-model="weeklyRepeat" />
        <span>
          {{ $t('expertStation.calendar.weeklyRepeat') }}
          <span class="block text-xs text-muted">
            {{ $t('expertStation.calendar.weeklyRepeatHint') }}
          </span>
        </span>
      </label>
      <span class="text-xs text-muted">
        {{ $t('expertStation.calendar.dragHint') }}
      </span>
      <div class="ml-auto flex gap-2">
        <UButton
          variant="outline"
          :to="localePath('/calendar')"
        >
          {{ $t('expertStation.calendar.cancel') }}
        </UButton>
      </div>
    </div>

    <div
      v-if="override"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
    >
      <span>
        {{
          $t('expertStation.calendar.overrideBanner', {
            date: dayLabel(override.override_date)
          })
        }}
      </span>
      <UButton
        size="sm"
        color="warning"
        variant="soft"
        :loading="saving"
        @click="restoreWeekly"
      >
        {{ $t('expertStation.calendar.restoreWeekly') }}
      </UButton>
    </div>

    <div class="mt-3 flex flex-wrap gap-4 text-xs text-muted">
      <span class="inline-flex items-center gap-2">
        <span class="inline-block size-3 rounded-sm bg-primary/30" />
        {{ $t('expertStation.calendar.weeklyLegend') }}
      </span>
      <span class="inline-flex items-center gap-2">
        <span class="inline-block size-3 rounded-sm bg-warning/40" />
        {{ $t('expertStation.calendar.overrideLegend') }}
      </span>
      <span class="inline-flex items-center gap-2">
        <span class="inline-block size-3 rounded-sm border border-dashed border-orange-400" />
        {{ $t('expertStation.calendar.draggingLegend') }}
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
      v-else
      class="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]"
    >
      <div class="overflow-x-auto rounded-xl border border-default bg-default">
        <div
          class="grid min-w-[720px]"
          :style="{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(0, 1fr))` }"
        >
          <div class="border-b border-default bg-elevated p-2" />
          <div
            v-for="date in dates"
            :key="`h-${date}`"
            class="border-b border-l border-default p-2 text-center text-xs"
            :class="cellIsOverride(date) ? 'bg-warning/10' : 'bg-elevated'"
          >
            {{ dayLabel(date) }}
          </div>
          <template
            v-for="slot in slots"
            :key="slot"
          >
            <div class="border-t border-default px-2 py-2 text-xs text-muted">
              {{ slot }}
            </div>
            <button
              v-for="date in dates"
              :key="`${date}-${slot}`"
              type="button"
              class="min-h-9 border-l border-t border-default"
              :class="{
                'bg-primary/25': cellActive(date, slot) && !cellIsOverride(date) && !(dragDay === date && dragMinutes.includes(expertHhmmToMinute(slot))),
                'bg-warning/30': cellActive(date, slot) && cellIsOverride(date) && !(dragDay === date && dragMinutes.includes(expertHhmmToMinute(slot))),
                'bg-orange-200/50 outline outline-dashed outline-orange-400': dragDay === date && dragMinutes.includes(expertHhmmToMinute(slot))
              }"
              @pointerdown="onPointerDown(date, slot, $event)"
              @pointerenter="onPointerEnter(date, slot)"
            />
          </template>
        </div>
      </div>

      <aside class="rounded-xl border border-default bg-default p-4 text-sm">
        <h2 class="font-semibold">
          {{ $t('expertStation.calendar.overridePanelTitle') }}
        </h2>
        <dl class="mt-3 space-y-2">
          <div>
            <dt class="text-muted">
              {{ $t('expertStation.calendar.weeklyTemplate') }}
            </dt>
            <dd>{{ weeklyTemplateLabel }}</dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('expertStation.calendar.actualToday') }}
            </dt>
            <dd>{{ actualTodayLabel }}</dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('expertBookings.columns.status') }}
            </dt>
            <dd>
              <UBadge
                v-if="override"
                color="warning"
                variant="subtle"
              >
                {{ $t('expertStation.calendar.overrideStatus') }}
              </UBadge>
              <span v-else>—</span>
            </dd>
          </div>
        </dl>
        <UButton
          v-if="override"
          class="mt-4"
          block
          color="warning"
          variant="soft"
          :loading="saving"
          @click="restoreWeekly"
        >
          {{ $t('expertStation.calendar.restoreWeekly') }}
        </UButton>
      </aside>
    </div>
  </div>
</template>
