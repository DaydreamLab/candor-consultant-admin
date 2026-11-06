import type {
  ExpertCalendarAppointmentBlock,
  ExpertDayAvailabilityOverride,
  ExpertWeeklyAvailabilityRule
} from '~/utils/expert-booking-types'

/** 30-minute grid labels from startHour inclusive to endHour exclusive. */
export function halfHourSlots(startHour = 9, endHour = 18): string[] {
  const out: string[] = []
  for (let hour = startHour; hour < endHour; hour += 1) {
    out.push(`${String(hour).padStart(2, '0')}:00`)
    out.push(`${String(hour).padStart(2, '0')}:30`)
  }
  return out
}

export function parseHm(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function expertAddDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday-start week containing `anchor` (YYYY-MM-DD). */
export function expertWeekStartMonday(anchor?: string): string {
  const d = anchor
    ? new Date(`${anchor}T12:00:00`)
    : (() => {
        const now = new Date()
        now.setHours(12, 0, 0, 0)
        return now
      })()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function expertWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => expertAddDaysToDateString(weekStart, i))
}

export function weekdayOfDate(date: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const d = new Date(`${date}T12:00:00`)
  const js = d.getDay()
  return (js === 0 ? 7 : js) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

export function slotCovered(
  startTime: string,
  endTime: string,
  slotStart: string
): boolean {
  const s = parseHm(startTime)
  const e = parseHm(endTime)
  const x = parseHm(slotStart)
  return x >= s && x < e
}

/** Effective availability slots for one expert on one date (override wins). */
export function effectiveAvailabilityForDate(
  expertId: string,
  date: string,
  weeklyRules: ExpertWeeklyAvailabilityRule[],
  overrides: ExpertDayAvailabilityOverride[]
): { slots: Array<{ start_time: string, end_time: string }>, isOverride: boolean } {
  const override = overrides.find(o => o.expert_id === expertId && o.date === date)
  if (override) {
    return { slots: override.slots.map(s => ({ ...s })), isOverride: true }
  }
  const weekday = weekdayOfDate(date)
  const slots = weeklyRules
    .filter(r => r.expert_id === expertId && r.weekday === weekday)
    .map(r => ({ start_time: r.start_time, end_time: r.end_time }))
  return { slots, isOverride: false }
}

export function isSlotAvailable(
  expertId: string,
  date: string,
  slotStart: string,
  weeklyRules: ExpertWeeklyAvailabilityRule[],
  overrides: ExpertDayAvailabilityOverride[]
): boolean {
  const { slots } = effectiveAvailabilityForDate(expertId, date, weeklyRules, overrides)
  return slots.some(s => slotCovered(s.start_time, s.end_time, slotStart))
}

/**
 * Drag selection must stay on a single day column.
 * Returns ordered unique 30-min slot starts between a and b (inclusive of start grid).
 */
export function dragSelectSlotsSameDay(
  day: string,
  startSlot: string,
  endSlot: string
): { date: string, slots: string[] } {
  const a = parseHm(startSlot)
  const b = parseHm(endSlot)
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const slots: string[] = []
  for (let m = lo; m <= hi; m += 30) {
    slots.push(formatHm(m))
  }
  return { date: day, slots }
}

/** Merge contiguous selected 30-min starts into ranges. */
export function mergeHalfHourStarts(starts: string[]): Array<{ start_time: string, end_time: string }> {
  if (!starts.length) {
    return []
  }
  const sorted = [...new Set(starts)].sort((a, b) => parseHm(a) - parseHm(b))
  const ranges: Array<{ start_time: string, end_time: string }> = []
  let rangeStart = sorted[0]!
  let prev = sorted[0]!
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i]!
    if (parseHm(cur) === parseHm(prev) + 30) {
      prev = cur
      continue
    }
    ranges.push({ start_time: rangeStart, end_time: formatHm(parseHm(prev) + 30) })
    rangeStart = cur
    prev = cur
  }
  ranges.push({ start_time: rangeStart, end_time: formatHm(parseHm(prev) + 30) })
  return ranges
}

export function appointmentsForDate(
  appointments: ExpertCalendarAppointmentBlock[],
  date: string,
  expertIds: string[]
): ExpertCalendarAppointmentBlock[] {
  const allow = new Set(expertIds)
  return appointments.filter(a => a.date === date && allow.has(a.expert_id))
}

export function preferredSlotsLabel(
  slots: Array<{ date: string, start_hour: number, end_hour: number }>
): string {
  return slots
    .map((s) => {
      const md = s.date.slice(5).replace('-', '/')
      return `${md} ${s.start_hour}-${s.end_hour}`
    })
    .join('；')
}

export function shortOrderCode(orderCode: string): string {
  if (orderCode.length <= 8) {
    return orderCode
  }
  return `...${orderCode.slice(-4)}`
}
