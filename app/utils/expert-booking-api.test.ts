import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cancelAdminExpertBooking,
  completeExpertStationBooking,
  deleteExpertCalendarDayOverride,
  getExpertStationBooking,
  listAdminExpertBookings,
  listExpertStationBookings,
  pinExpertStationBooking,
  putAdminExpertBookingProductPicks,
  putExpertCalendarDayOverride,
  putExpertStationConfirmTime,
  putExpertStationServiceRecord,
  resetExpertBookingMockStore,
  uploadExpertStationAttachment
} from './expert-booking-api'
import {
  EXPERT_BOOKING_FIXTURE_EXPERT_A
} from './expert-booking-fixtures'

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { expertBookingMock: true }
}))

describe('expert-booking-api mock', () => {
  afterEach(() => {
    resetExpertBookingMockStore()
  })

  it('lists admin bookings with OpenAPI envelope and cancels with optional reason', async () => {
    const list = await listAdminExpertBookings('https://example.test/api/v1', 't')
    expect(list.expert_bookings.length).toBeGreaterThan(0)
    expect(list.total).toBe(list.expert_bookings.length)
    expect(list.last_seen_booking_id).toBeNull()

    const cancelled = await cancelAdminExpertBooking(
      'https://example.test/api/v1',
      't',
      'eb-await-1',
      '客戶改期失敗'
    )
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.cancel_reason).toBe('客戶改期失敗')
  })

  it('tracks per-expert pin and last_seen_booking_id', async () => {
    await pinExpertStationBooking(
      'https://example.test/api/v1',
      't',
      EXPERT_BOOKING_FIXTURE_EXPERT_A,
      'eb-await-1',
      true
    )
    const before = await listExpertStationBookings(
      'https://example.test/api/v1',
      't',
      EXPERT_BOOKING_FIXTURE_EXPERT_A
    )
    expect(before.expert_bookings.find(i => i.id === 'eb-await-1')?.pinned).toBe(true)
    expect(before.last_seen_booking_id).toBe('eb-await-1')

    await getExpertStationBooking(
      'https://example.test/api/v1',
      't',
      EXPERT_BOOKING_FIXTURE_EXPERT_A,
      'eb-sched-1'
    )
    const after = await listExpertStationBookings(
      'https://example.test/api/v1',
      't',
      EXPERT_BOOKING_FIXTURE_EXPERT_A
    )
    expect(after.last_seen_booking_id).toBe('eb-sched-1')
  })

  it('confirm-time uses confirmed_starts_at; complete marks done', async () => {
    const confirmed = await putExpertStationConfirmTime(
      'https://example.test/api/v1',
      't',
      EXPERT_BOOKING_FIXTURE_EXPERT_A,
      'eb-await-1',
      {
        confirmed_starts_at: '2026-04-12T15:00:00+08:00',
        confirmed_ends_at: '2026-04-12T15:30:00+08:00'
      }
    )
    expect(confirmed.status).toBe('scheduled')
    expect(confirmed.confirmed_starts_at).toContain('2026-04-12')

    const again = await putExpertStationConfirmTime(
      'https://example.test/api/v1',
      't',
      EXPERT_BOOKING_FIXTURE_EXPERT_A,
      'eb-await-1',
      { confirmed_starts_at: '2026-04-13T10:00:00+08:00' }
    )
    expect(again.status).toBe('scheduled')

    const done = await completeExpertStationBooking('https://example.test/api/v1', 't', 'eb-await-1')
    expect(done.status).toBe('completed')
  })

  it('saves product_picks without creating an order', async () => {
    const picks = await putAdminExpertBookingProductPicks(
      'https://example.test/api/v1',
      't',
      'eb-await-1',
      [{
        sellable_item_id: 'si-alpha',
        reason: '協助放鬆'
      }]
    )
    expect(picks).toHaveLength(1)
    expect(picks[0]?.reason).toBe('協助放鬆')
    expect(picks[0]?.sellable_item_id).toBe('si-alpha')
  })

  it('uploads attachment then saves service_record with served_at', async () => {
    const file = new Blob(['pdf'], { type: 'application/pdf' })
    const uploaded = await uploadExpertStationAttachment(
      'https://example.test/api/v1',
      't',
      'eb-sched-1',
      file,
      'note.pdf'
    )
    expect(uploaded.key).toContain('eb-sched-1')
    expect(uploaded.filename).toBe('note.pdf')

    const record = await putExpertStationServiceRecord(
      'https://example.test/api/v1',
      't',
      EXPERT_BOOKING_FIXTURE_EXPERT_A,
      'eb-sched-1',
      {
        served_at: '2026-04-10T10:00:00.000Z',
        service_method: '電話',
        content: '已完成諮詢',
        sales_content: '',
        attachments: [uploaded]
      }
    )
    expect(record.sales_content).toBe('無')
    expect(record.served_at).toContain('2026-04-10')
    expect(record.filled_by_operator_id).toBe(EXPERT_BOOKING_FIXTURE_EXPERT_A)
    expect(record.attachments).toHaveLength(1)
  })

  it('puts and clears day override with override_date body', async () => {
    await putExpertCalendarDayOverride('https://example.test/api/v1', 't', {
      expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A,
      override_date: '2026-04-11',
      slots: [600, 630]
    })
    const cleared = await deleteExpertCalendarDayOverride(
      'https://example.test/api/v1',
      't',
      {
        expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A,
        override_date: '2026-04-11'
      }
    )
    expect(cleared.cleared).toBe(true)
  })
})
