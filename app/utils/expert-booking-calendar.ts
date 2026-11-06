import type {
  ExpertCalendarDayOverride,
  ExpertCalendarScheduledBooking,
  ExpertCalendarWeeklySlot
} from './expert-booking-types'

/** OpenAPI weekday: 0=Sunday … 6=Saturday */
export const EXPERT_WEEKDAY_LABELS_ZH = ['日', '一', '二', '三', '四', '五', '六'] as const

/** All 30-minute slot starts in a day: 0 … 1410 (display usually 09:00–18:00). */
export const EXPERT_SLOT_START_MINUTES: readonly number[] = Array.from(
  { length: 48 },
  (_, i) => i * 30
)

export function expertMinuteToHhmm(minute: number): string {
  const h = Math.floor(minute / 60)
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function expertHhmmToMinute(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Display slots as HH:mm between [startHour, endHour). */
export function halfHourSlots(startHour = 9, endHour = 18): string[] {
  const out: string[] = []
  for (let minute = startHour * 60; minute < endHour * 60; minute += 30) {
    out.push(expertMinuteToHhmm(minute))
  }
  return out
}

export function expertIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseExpertDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y!, (m || 1) - 1, d || 1)
}

/** JS getDay(): 0=Sun … 6=Sat — matches OpenAPI weekday. */
export function weekdayOfDate(isoDate: string): number {
  return parseExpertDate(isoDate).getDay()
}

export function expertAddDaysToDateString(isoDate: string, n: number): string {
  const d = parseExpertDate(isoDate)
  d.setDate(d.getDate() + n)
  return expertIsoDate(d)
}

/** Monday of the week containing isoDate (UI week grid). */
export function expertWeekStartMonday(isoDate: string): string {
  const d = parseExpertDate(isoDate)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  return expertIsoDate(d)
}

export function expertWeekDates(weekStartMonday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => expertAddDaysToDateString(weekStartMonday, i))
}

export function preferredSlotsLabel(slots: string[] | null | undefined): string {
  if (!slots?.length) {
    return '—'
  }
  return slots.join('；')
}

export function shortOrderCode(orderNo: string | null | undefined): string {
  if (!orderNo) {
    return '—'
  }
  if (orderNo.length <= 12) {
    return orderNo
  }
  return `...${orderNo.slice(-4)}`
}

export function expertSlotKey(weekday: number, slotStartMinute: number): string {
  return `${weekday}:${slotStartMinute}`
}

export function effectiveSlotsForDate(
  expertOperatorId: string,
  isoDate: string,
  weekly: ExpertCalendarWeeklySlot[],
  dayOverrides: ExpertCalendarDayOverride[]
): { isOverride: boolean, slots: number[] } {
  const override = dayOverrides.find(
    o => o.expert_operator_id === expertOperatorId && o.override_date === isoDate
  )
  if (override) {
    return { isOverride: true, slots: [...override.slots].sort((a, b) => a - b) }
  }
  const weekday = weekdayOfDate(isoDate)
  const slots = weekly
    .filter(s => s.expert_operator_id === expertOperatorId && s.weekday === weekday)
    .map(s => s.slot_start_minute)
    .sort((a, b) => a - b)
  return { isOverride: false, slots }
}

export function isSlotAvailable(
  expertOperatorId: string,
  isoDate: string,
  hhmm: string,
  weekly: ExpertCalendarWeeklySlot[],
  dayOverrides: ExpertCalendarDayOverride[]
): boolean {
  const minute = expertHhmmToMinute(hhmm)
  return effectiveSlotsForDate(expertOperatorId, isoDate, weekly, dayOverrides).slots.includes(minute)
}

export function scheduledBookingsForDate(
  bookings: ExpertCalendarScheduledBooking[],
  isoDate: string
): ExpertCalendarScheduledBooking[] {
  return bookings.filter((b) => {
    if (!b.confirmed_starts_at) {
      return false
    }
    return b.confirmed_starts_at.slice(0, 10) === isoDate
  })
}

/** Drag-select contiguous half-hour slots on one day (returns minutes). */
export function dragSelectSlotMinutes(
  startHhmm: string,
  endHhmm: string
): number[] {
  const start = expertHhmmToMinute(startHhmm)
  const end = expertHhmmToMinute(endHhmm)
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const out: number[] = []
  for (let m = lo; m <= hi; m += 30) {
    out.push(m)
  }
  return out
}

/** @deprecated alias — prefer dragSelectSlotMinutes */
export function dragSelectSlotsSameDay(
  date: string,
  startHhmm: string,
  endHhmm: string
): { date: string, slots: string[] } {
  return {
    date,
    slots: dragSelectSlotMinutes(startHhmm, endHhmm).map(expertMinuteToHhmm)
  }
}

export function slotCovered(startTime: string, endTime: string, slotHhmm: string): boolean {
  const slot = expertHhmmToMinute(slotHhmm)
  const start = expertHhmmToMinute(startTime)
  const end = expertHhmmToMinute(endTime)
  return slot >= start && slot < end
}

export function mergeHalfHourStarts(starts: string[]): Array<{ start_time: string, end_time: string }> {
  if (!starts.length) {
    return []
  }
  const minutes = [...starts].map(expertHhmmToMinute).sort((a, b) => a - b)
  const ranges: Array<{ start_time: string, end_time: string }> = []
  let rangeStart = minutes[0]!
  let prev = minutes[0]!
  for (let i = 1; i < minutes.length; i++) {
    const cur = minutes[i]!
    if (cur === prev + 30) {
      prev = cur
      continue
    }
    ranges.push({
      start_time: expertMinuteToHhmm(rangeStart),
      end_time: expertMinuteToHhmm(prev + 30)
    })
    rangeStart = cur
    prev = cur
  }
  ranges.push({
    start_time: expertMinuteToHhmm(rangeStart),
    end_time: expertMinuteToHhmm(prev + 30)
  })
  return ranges
}

export function effectiveAvailabilityForDate(
  expertOperatorId: string,
  isoDate: string,
  weekly: ExpertCalendarWeeklySlot[],
  dayOverrides: ExpertCalendarDayOverride[]
): { isOverride: boolean, slots: Array<{ start_time: string, end_time: string }> } {
  const result = effectiveSlotsForDate(expertOperatorId, isoDate, weekly, dayOverrides)
  return {
    isOverride: result.isOverride,
    slots: mergeHalfHourStarts(result.slots.map(expertMinuteToHhmm))
  }
}
