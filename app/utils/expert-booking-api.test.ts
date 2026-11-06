import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cancelAdminExpertBooking,
  completeExpertStationBooking,
  confirmExpertStationBooking,
  deleteExpertStationDayOverride,
  getExpertStationBooking,
  listAdminExpertBookings,
  listExpertStationBookings,
  pinExpertStationBooking,
  putAdminExpertBookingProductReasons,
  resetExpertBookingMockStore
} from './expert-booking-api'

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { expertBookingMock: true }
}))

describe('expert-booking-api mock', () => {
  afterEach(() => {
    resetExpertBookingMockStore()
  })

  it('lists paid admin bookings and cancels without refund side-effect', async () => {
    const list = await listAdminExpertBookings('https://example.test/api/v1', 't')
    expect(list.items.length).toBeGreaterThan(0)
    expect(list.items.every(i => i.payment_status === 'paid')).toBe(true)

    const cancelled = await cancelAdminExpertBooking('https://example.test/api/v1', 't', 'eb-0021')
    expect(cancelled.status).toBe('cancelled')
  })

  it('tracks per-expert pin and last seen (C9)', async () => {
    await pinExpertStationBooking('https://example.test/api/v1', 't', 'op-expert-wang', 'eb-0019', true)
    const before = await listExpertStationBookings(
      'https://example.test/api/v1',
      't',
      'op-expert-wang'
    )
    expect(before.items.find(i => i.id === 'eb-0019')?.pinned).toBe(true)
    expect(before.last_seen?.booking_id).toBe('eb-0021')

    await getExpertStationBooking('https://example.test/api/v1', 't', 'op-expert-wang', 'eb-0015')
    const after = await listExpertStationBookings(
      'https://example.test/api/v1',
      't',
      'op-expert-wang'
    )
    expect(after.last_seen?.booking_id).toBe('eb-0015')
  })

  it('confirm keeps scheduled on reschedule; complete marks done', async () => {
    const confirmed = await confirmExpertStationBooking(
      'https://example.test/api/v1',
      't',
      'op-expert-wang',
      'eb-0021',
      '2026-11-12T15:00:00+08:00'
    )
    expect(confirmed.status).toBe('scheduled')
    expect(confirmed.confirmed_at).toContain('2026-11-12')

    const again = await confirmExpertStationBooking(
      'https://example.test/api/v1',
      't',
      'op-expert-wang',
      'eb-0021',
      '2026-11-13T10:00:00+08:00'
    )
    expect(again.status).toBe('scheduled')

    const done = await completeExpertStationBooking('https://example.test/api/v1', 't', 'eb-0021')
    expect(done.status).toBe('completed')
  })

  it('saves product reasons without creating an order (C6)', async () => {
    const row = await putAdminExpertBookingProductReasons(
      'https://example.test/api/v1',
      't',
      'eb-0021',
      [{
        sellable_item_id: 'si-magnesium',
        name_zh: 'Magnesium 6 in 1 6合1鎂',
        name_en: 'Magnesium 6 in 1',
        reason: '協助放鬆'
      }]
    )
    expect(row.product_reasons).toHaveLength(1)
    expect(row.product_reasons[0]?.reason).toBe('協助放鬆')
  })

  it('restores day override to weekly template', async () => {
    const cal = await deleteExpertStationDayOverride(
      'https://example.test/api/v1',
      't',
      'op-expert-wang',
      '2026-11-13',
      '王專家'
    )
    expect(cal.day_overrides.find(o => o.date === '2026-11-13')).toBeUndefined()
  })
})
