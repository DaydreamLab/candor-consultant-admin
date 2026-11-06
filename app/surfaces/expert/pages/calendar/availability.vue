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
  paintSlotMinutes,
  planExpertCalendarWrites,
  weekdayOfDate
} from '~/utils/expert-booking-calendar'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertCalendarSnapshot } from '~/utils/expert-booking-types'

const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const { start: windowStart, end: windowEnd, slots, startItems, endItems } = useExpertWorkWindow()
const weekStart = ref(expertWeekStartMonday('2026-04-10'))
const dates = computed(() => expertWeekDates(weekStart.value))
const snapshot = ref<ExpertCalendarSnapshot | null>(null)
const draft = ref<ExpertCalendarSnapshot | null>(null)
const expertId = ref('')
const weeklyRepeat = ref(true)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const selectedOverrideDate = ref<string | null>('2026-04-10')

const dragDay = ref<string | null>(null)
const dragMinutes = ref<number[]>([])
const dragStart = ref<string | null>(null)
const dragMode = ref<'add' | 'remove'>('add')

const dirty = computed(() => {
  if (!snapshot.value || !draft.value) {
    return false
  }
  const plan = planExpertCalendarWrites(snapshot.value, draft.value)
  return plan.weekly.length + plan.overrides.length + plan.clearedOverrides.length > 0
})

const expertItems = computed(() =>
  (snapshot.value?.experts || []).map(e => ({
    label: e.name || e.email || e.id,
    value: e.id
  }))
)

const override = computed(() => {
  if (!draft.value || !selectedOverrideDate.value || !expertId.value) {
    return null
  }
  return draft.value.day_overrides.find(
    o => o.expert_operator_id === expertId.value && o.override_date === selectedOverrideDate.value
  ) || null
})

const weeklyTemplateLabel = computed(() => {
  if (!selectedOverrideDate.value || !draft.value || !expertId.value) {
    return '—'
  }
  const weekday = weekdayOfDate(selectedOverrideDate.value)
  const minutes = draft.value.weekly
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
    adopt(data)
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

function cloneCalendar(source: ExpertCalendarSnapshot): ExpertCalendarSnapshot {
  return {
    experts: source.experts.map(expert => ({ ...expert })),
    weekly: source.weekly.map(row => ({ ...row })),
    day_overrides: source.day_overrides.map(row => ({
      ...row,
      slots: [...row.slots]
    })),
    scheduled_bookings: source.scheduled_bookings.map(row => ({ ...row }))
  }
}

function adopt(data: ExpertCalendarSnapshot) {
  snapshot.value = cloneCalendar(data)
  draft.value = cloneCalendar(data)
}

function cellActive(date: string, slot: string) {
  if (!draft.value || !expertId.value) {
    return false
  }
  const minute = expertHhmmToMinute(slot)
  if (dragDay.value === date && dragMinutes.value.includes(minute)) {
    return true
  }
  return effectiveSlotsForDate(
    expertId.value,
    date,
    draft.value.weekly,
    draft.value.day_overrides
  ).slots.includes(minute)
}

function cellIsOverride(date: string) {
  return Boolean(
    draft.value?.day_overrides.some(
      o => o.expert_operator_id === expertId.value && o.override_date === date
    )
  )
}

function slotsBeingEdited(date: string): number[] {
  if (!draft.value || !expertId.value) {
    return []
  }
  if (weeklyRepeat.value) {
    const weekday = weekdayOfDate(date)
    return draft.value.weekly
      .filter(r => r.expert_operator_id === expertId.value && r.weekday === weekday)
      .map(r => r.slot_start_minute)
      .sort((a, b) => a - b)
  }
  return effectiveSlotsForDate(
    expertId.value,
    date,
    draft.value.weekly,
    draft.value.day_overrides
  ).slots
}

function onPointerDown(date: string, slot: string, event: PointerEvent) {
  event.preventDefault()
  const minute = expertHhmmToMinute(slot)
  dragDay.value = date
  dragStart.value = slot
  dragMinutes.value = [minute]
  dragMode.value = slotsBeingEdited(date).includes(minute) ? 'remove' : 'add'
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

async function reloadFromServer() {
  const token = readOperatorToken()
  if (!token) {
    return
  }
  adopt(await getExpertCalendar(config.public.apiBase, token, {
    from: dates.value[0]!,
    to: dates.value[dates.value.length - 1]!,
    expert_operator_id: expertId.value || null
  }))
}

function applyEditedSlots(date: string, nextDaySlots: number[]) {
  if (!draft.value || !expertId.value) {
    return
  }
  if (weeklyRepeat.value) {
    const weekday = weekdayOfDate(date)
    const kept = draft.value.weekly.filter(
      r => !(r.expert_operator_id === expertId.value && r.weekday === weekday)
    )
    draft.value = {
      ...draft.value,
      weekly: [
        ...kept,
        ...nextDaySlots.map(slot_start_minute => ({
          expert_operator_id: expertId.value,
          weekday,
          slot_start_minute
        }))
      ]
    }
    return
  }
  const kept = draft.value.day_overrides.filter(
    o => !(o.expert_operator_id === expertId.value && o.override_date === date)
  )
  draft.value = {
    ...draft.value,
    day_overrides: [
      ...kept,
      {
        expert_operator_id: expertId.value,
        override_date: date,
        slots: nextDaySlots
      }
    ]
  }
}

function onPointerUp() {
  const date = dragDay.value
  const painted = [...dragMinutes.value]
  const mode = dragMode.value
  dragDay.value = null
  dragStart.value = null
  dragMinutes.value = []
  if (!date || !painted.length || !draft.value || !expertId.value) {
    return
  }
  applyEditedSlots(date, paintSlotMinutes(slotsBeingEdited(date), painted, mode))
}

function revertDraft() {
  if (!snapshot.value || saving.value) {
    return
  }
  draft.value = cloneCalendar(snapshot.value)
}

async function saveDraft() {
  if (!snapshot.value || !draft.value || saving.value) {
    return
  }
  const plan = planExpertCalendarWrites(snapshot.value, draft.value)
  if (!plan.weekly.length && !plan.overrides.length && !plan.clearedOverrides.length) {
    return
  }
  const token = readOperatorToken()
  if (!token) {
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    for (const weekly of plan.weekly) {
      await putExpertCalendarWeekly(config.public.apiBase, token, weekly)
    }
    for (const overrideRow of plan.overrides) {
      await putExpertCalendarDayOverride(config.public.apiBase, token, overrideRow)
    }
    for (const cleared of plan.clearedOverrides) {
      await deleteExpertCalendarDayOverride(config.public.apiBase, token, cleared)
    }
    await reloadFromServer()
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    saving.value = false
  }
}

function restoreWeekly() {
  if (!draft.value || !selectedOverrideDate.value || !expertId.value || saving.value) {
    return
  }
  draft.value = {
    ...draft.value,
    day_overrides: draft.value.day_overrides.filter(
      o => !(o.expert_operator_id === expertId.value && o.override_date === selectedOverrideDate.value)
    )
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
    <div class="mt-4 flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('expertStation.calendar.availabilityTitle') }}
      </h1>
      <UButton
        size="sm"
        variant="outline"
        :to="localePath('/')"
      >
        {{ $t('expertStation.calendar.cancel') }}
      </UButton>
    </div>

    <div class="mt-4 overflow-hidden rounded-xl border border-default bg-default">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-default px-4 py-3">
        <div class="inline-flex items-center gap-2">
          <span class="text-sm text-muted">
            {{ $t('expertStation.calendar.expert') }}
          </span>
          <USelect
            v-model="expertId"
            :items="expertItems"
            size="sm"
            class="min-w-40"
          />
        </div>
        <label class="inline-flex items-center gap-2 text-sm">
          <USwitch
            v-model="weeklyRepeat"
            size="sm"
          />
          {{ $t('expertStation.calendar.weeklyRepeat') }}
        </label>
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
        <div class="ml-auto flex items-center gap-2">
          <span
            v-if="dirty"
            class="text-sm text-muted"
          >
            {{ $t('expertStation.calendar.dirtyHint') }}
          </span>
          <UButton
            size="sm"
            variant="outline"
            :disabled="!dirty || saving"
            @click="revertDraft"
          >
            {{ $t('expertStation.calendar.revertChanges') }}
          </UButton>
          <UButton
            size="sm"
            :disabled="!dirty"
            :loading="saving"
            @click="saveDraft"
          >
            {{ $t('expertStation.calendar.save') }}
          </UButton>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-default px-4 py-3 text-sm text-muted">
        <span class="inline-flex items-center gap-2">
          <span class="inline-block size-2.5 rounded-sm bg-primary/30" />
          {{ $t('expertStation.calendar.weeklyLegend') }}
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="inline-block size-2.5 rounded-sm bg-warning/40" />
          {{ $t('expertStation.calendar.overrideLegend') }}
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="inline-block size-2.5 rounded-sm border border-dashed border-orange-400" />
          {{ $t('expertStation.calendar.draggingLegend') }}
        </span>
        <span>
          {{ $t('expertStation.calendar.weeklyRepeatHint') }}
        </span>
        <span>
          {{ $t('expertStation.calendar.dragHint') }}
        </span>
      </div>

      <div
        v-if="override"
        class="flex flex-wrap items-center justify-between gap-3 border-b border-warning/40 bg-warning/10 px-4 py-3 text-sm"
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
          :disabled="saving"
          @click="restoreWeekly"
        >
          {{ $t('expertStation.calendar.restoreWeekly') }}
        </UButton>
      </div>

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
      <div
        v-else
        class="lg:grid lg:grid-cols-[minmax(0,1fr)_240px]"
      >
        <div class="overflow-x-auto">
          <div
            class="grid min-w-[720px]"
            :style="{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(0, 1fr))` }"
          >
            <div class="border-b border-default bg-elevated p-2 text-xs text-muted" />
            <div
              v-for="date in dates"
              :key="`h-${date}`"
              class="flex flex-col items-center border-b border-l border-default p-2 text-center text-xs font-medium"
              :class="cellIsOverride(date) ? 'bg-warning/10' : 'bg-elevated'"
            >
              <span class="inline-flex items-center justify-center gap-1">
                {{ $t(`expertStation.calendar.weekdays.${weekdayOfDate(date)}`) }}
                {{ dayLabel(date) }}
              </span>
            </div>
            <template
              v-for="slot in slots"
              :key="slot"
            >
              <div class="border-t border-default px-2 py-3 text-center text-xs text-muted">
                {{ slot }}
              </div>
              <button
                v-for="date in dates"
                :key="`${date}-${slot}`"
                type="button"
                class="min-h-10 border-l border-t border-default"
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

        <aside class="border-t border-default p-4 text-sm lg:border-t-0 lg:border-l">
          <h2 class="font-semibold text-highlighted">
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
            size="sm"
            color="warning"
            variant="soft"
            :disabled="saving"
            @click="restoreWeekly"
          >
            {{ $t('expertStation.calendar.restoreWeekly') }}
          </UButton>
        </aside>
      </div>
    </div>
  </div>
</template>
