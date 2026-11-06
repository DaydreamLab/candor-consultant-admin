import { describe, expect, it } from 'vitest'
import {
  dragSelectSlotsSameDay,
  effectiveAvailabilityForDate,
  expertAddDaysToDateString,
  expertWeekStartMonday,
  halfHourSlots,
  mergeHalfHourStarts,
  preferredSlotsLabel,
  shortOrderCode,
  weekdayOfDate
} from './expert-booking-calendar'

describe('expert-booking-calendar', () => {
  it('builds 30-minute slots 09:00–17:30', () => {
    const slots = halfHourSlots(9, 18)
    expect(slots[0]).toBe('09:00')
    expect(slots[1]).toBe('09:30')
    expect(slots.at(-1)).toBe('17:30')
    expect(slots).toHaveLength(18)
  })

  it('computes Monday week start', () => {
    expect(expertWeekStartMonday('2026-11-12')).toBe('2026-11-09')
    expect(weekdayOfDate('2026-11-13')).toBe(5)
    expect(expertAddDaysToDateString('2026-11-09', 6)).toBe('2026-11-15')
  })

  it('keeps drag selection on one day and merges ranges', () => {
    const { date, slots } = dragSelectSlotsSameDay('2026-11-12', '14:00', '15:00')
    expect(date).toBe('2026-11-12')
    expect(slots).toEqual(['14:00', '14:30', '15:00'])
    expect(mergeHalfHourStarts(slots)).toEqual([
      { start_time: '14:00', end_time: '15:30' }
    ])
  })

  it('prefers day override over weekly template', () => {
    const weekly = [
      { expert_id: 'e1', weekday: 5 as const, start_time: '09:00', end_time: '12:00' }
    ]
    const overrides = [
      {
        expert_id: 'e1',
        date: '2026-11-13',
        slots: [{ start_time: '10:00', end_time: '12:00' }],
        updated_by_operator_id: null,
        updated_by_name: null,
        updated_at: null
      }
    ]
    const result = effectiveAvailabilityForDate('e1', '2026-11-13', weekly, overrides)
    expect(result.isOverride).toBe(true)
    expect(result.slots).toEqual([{ start_time: '10:00', end_time: '12:00' }])
  })

  it('formats preferred slots and short order code', () => {
    expect(preferredSlotsLabel([
      { date: '2026-11-12', start_hour: 14, end_hour: 16 },
      { date: '2026-11-13', start_hour: 10, end_hour: 12 }
    ])).toBe('11/12 14-16；11/13 10-12')
    expect(shortOrderCode('ORD-261106-000021')).toBe('...0021')
  })
})
