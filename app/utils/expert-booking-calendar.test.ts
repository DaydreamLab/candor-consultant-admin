import { describe, expect, it } from 'vitest'
import {
  dragSelectSlotsSameDay,
  effectiveAvailabilityForDate,
  expertAddDaysToDateString,
  expertHhmmToMinute,
  expertMinuteToHhmm,
  expertWeekStartMonday,
  halfHourSlots,
  mergeHalfHourStarts,
  preferredSlotsLabel,
  shortOrderCode,
  weekdayOfDate
} from './expert-booking-calendar'
import type {
  ExpertCalendarDayOverride,
  ExpertCalendarWeeklySlot
} from './expert-booking-types'

describe('expert-booking-calendar', () => {
  it('builds 30-minute slots 09:00–17:30', () => {
    const slots = halfHourSlots(9, 18)
    expect(slots[0]).toBe('09:00')
    expect(slots[1]).toBe('09:30')
    expect(slots.at(-1)).toBe('17:30')
    expect(slots).toHaveLength(18)
  })

  it('computes Monday week start and OpenAPI weekday 0=Sun', () => {
    expect(expertWeekStartMonday('2026-04-10')).toBe('2026-04-06')
    expect(weekdayOfDate('2026-04-10')).toBe(5) // Friday
    expect(expertAddDaysToDateString('2026-04-06', 6)).toBe('2026-04-12')
  })

  it('keeps drag selection on one day and merges ranges', () => {
    const { date, slots } = dragSelectSlotsSameDay('2026-04-10', '14:00', '15:00')
    expect(date).toBe('2026-04-10')
    expect(slots).toEqual(['14:00', '14:30', '15:00'])
    expect(mergeHalfHourStarts(slots)).toEqual([
      { start_time: '14:00', end_time: '15:30' }
    ])
    expect(expertHhmmToMinute('10:00')).toBe(600)
    expect(expertMinuteToHhmm(630)).toBe('10:30')
  })

  it('prefers day override over weekly template (slot_start_minute)', () => {
    const weekly: ExpertCalendarWeeklySlot[] = [
      { weekday: 5, slot_start_minute: 540, expert_operator_id: 'e1' },
      { weekday: 5, slot_start_minute: 570, expert_operator_id: 'e1' }
    ]
    const overrides: ExpertCalendarDayOverride[] = [
      {
        expert_operator_id: 'e1',
        override_date: '2026-04-10',
        slots: [600, 630]
      }
    ]
    const result = effectiveAvailabilityForDate('e1', '2026-04-10', weekly, overrides)
    expect(result.isOverride).toBe(true)
    expect(result.slots).toEqual([
      { start_time: '10:00', end_time: '11:00' }
    ])
  })

  it('formats preferred slots and short order code', () => {
    expect(preferredSlotsLabel(['週二 19:00–21:00', '週四 14:00–16:00']))
      .toBe('週二 19:00–21:00；週四 14:00–16:00')
    expect(shortOrderCode('EB-A001')).toBe('EB-A001')
    expect(shortOrderCode('ORD-261106-000021')).toBe('...0021')
  })
})
