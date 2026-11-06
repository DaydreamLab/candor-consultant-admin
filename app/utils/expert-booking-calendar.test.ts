import { describe, expect, it } from 'vitest'
import {
  dragSelectSlotsSameDay,
  effectiveAvailabilityForDate,
  paintSlotMinutes,
  expertAddDaysToDateString,
  expertCalendarOverview,
  expertHhmmToMinute,
  expertMinuteToHhmm,
  expertWeekStartMonday,
  halfHourSlots,
  halfHourSlotsBetween,
  mergeHalfHourStarts,
  planExpertCalendarWrites,
  preferredSlotsLabel,
  shortOrderCode,
  weekdayOfDate
} from './expert-booking-calendar'
import type {
  ExpertCalendarDayOverride,
  ExpertCalendarWeeklySlot
} from './expert-booking-types'

describe('expert-booking-calendar', () => {
  it('builds 30-minute slots 06:00–19:30', () => {
    const slots = halfHourSlots(6, 20)
    expect(slots[0]).toBe('06:00')
    expect(slots[1]).toBe('06:30')
    expect(slots.at(-1)).toBe('19:30')
    expect(slots).toHaveLength(28)
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

  it('paints a later range without erasing an earlier gap', () => {
    const morning = dragSelectSlotsSameDay('2026-04-10', '09:00', '10:00').slots
      .map(expertHhmmToMinute)
    const afternoon = dragSelectSlotsSameDay('2026-04-10', '14:00', '14:30').slots
      .map(expertHhmmToMinute)
    const added = paintSlotMinutes(morning, afternoon, 'add')
    expect(added.map(expertMinuteToHhmm)).toEqual([
      '09:00', '09:30', '10:00', '14:00', '14:30'
    ])
    const cleared = paintSlotMinutes(added, [expertHhmmToMinute('09:30')], 'remove')
    expect(cleared.map(expertMinuteToHhmm)).toEqual([
      '09:00', '10:00', '14:00', '14:30'
    ])
  })

  it('plans weekly and day-override writes without touching unchanged rows', () => {
    const saved = {
      weekly: [
        { weekday: 1, slot_start_minute: 540, expert_operator_id: 'e1' },
        { weekday: 2, slot_start_minute: 600, expert_operator_id: 'e2' }
      ],
      day_overrides: [
        { expert_operator_id: 'e1', override_date: '2026-04-10', slots: [600] }
      ]
    }
    const draft = {
      weekly: [
        { weekday: 1, slot_start_minute: 540, expert_operator_id: 'e1' },
        { weekday: 1, slot_start_minute: 840, expert_operator_id: 'e1' },
        { weekday: 2, slot_start_minute: 600, expert_operator_id: 'e2' }
      ],
      day_overrides: [
        { expert_operator_id: 'e1', override_date: '2026-04-11', slots: [660, 960] }
      ]
    }
    expect(planExpertCalendarWrites(saved, draft)).toEqual({
      weekly: [{
        expert_operator_id: 'e1',
        slots: [
          { weekday: 1, slot_start_minute: 540 },
          { weekday: 1, slot_start_minute: 840 }
        ]
      }],
      overrides: [{
        expert_operator_id: 'e1',
        override_date: '2026-04-11',
        slots: [660, 960]
      }],
      clearedOverrides: [{
        expert_operator_id: 'e1',
        override_date: '2026-04-10'
      }]
    })
    expect(planExpertCalendarWrites(saved, saved)).toEqual({
      weekly: [],
      overrides: [],
      clearedOverrides: []
    })
    expect(halfHourSlotsBetween('06:00', '20:00')).toHaveLength(28)
    expect(halfHourSlotsBetween('06:00', '20:00').at(-1)).toBe('19:30')
  })

  it('counts scheduled bookings inside the visible window only', () => {
    const bookings = [
      { id: 'in-window', confirmed_starts_at: '2026-04-06T09:00:00', confirmed_ends_at: '2026-04-06T09:30:00', status: 'scheduled', confirmed_by_operator_id: 'e3' },
      { id: 'outside-window', confirmed_starts_at: '2026-04-06T18:00:00', confirmed_ends_at: '2026-04-06T18:30:00', status: 'scheduled', confirmed_by_operator_id: 'e1' },
      { id: 'other-day', confirmed_starts_at: '2026-04-08T09:00:00', confirmed_ends_at: null, status: 'scheduled', confirmed_by_operator_id: 'e1' }
    ]
    expect(expertCalendarOverview({
      dates: ['2026-04-06', '2026-04-07'],
      slots: ['09:00', '09:30'],
      scheduledBookings: bookings
    })).toEqual({
      bookings: 1
    })
  })

  it('formats preferred slots and short order code', () => {
    expect(preferredSlotsLabel(['週二 19:00–21:00', '週四 14:00–16:00']))
      .toBe('週二 19:00–21:00；週四 14:00–16:00')
    expect(shortOrderCode('EB-A001')).toBe('EB-A001')
    expect(shortOrderCode('ORD-261106-000021')).toBe('...0021')
  })
})
