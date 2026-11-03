import { describe, expect, it } from 'vitest'
import { orderHasPaid, resolveShippingPhase } from './shipping-phase'

describe('shipping-phase (B-17 訂單確認中)', () => {
  it('marks paid + no shipment as order_confirmed', () => {
    expect(resolveShippingPhase({ payment_status: 'paid' }, null)).toBe('order_confirmed')
    expect(resolveShippingPhase({
      payments: [{ status: 'succeeded' }]
    }, null)).toBe('order_confirmed')
  })

  it('does not invent order_confirmed when unpaid and no shipment', () => {
    expect(resolveShippingPhase({ payment_status: 'unpaid' }, null)).toBeNull()
  })

  it('maps shipment statuses without adding new API enums', () => {
    expect(resolveShippingPhase({ payment_status: 'paid' }, { status: 'picking' })).toBe('picking')
    expect(resolveShippingPhase({ payment_status: 'paid' }, { status: 'in_transit' })).toBe('in_transit')
    expect(resolveShippingPhase({ payment_status: 'paid' }, { status: 'arrived' })).toBe('arrived')
  })

  it('treats pending／unknown shipment status as order_confirmed when paid', () => {
    expect(resolveShippingPhase({ payment_status: 'paid' }, { status: 'pending' })).toBe('order_confirmed')
  })

  it('detects paid via payment_status or succeeded payment', () => {
    expect(orderHasPaid({ payment_status: 'paid' })).toBe(true)
    expect(orderHasPaid({ payments: [{ status: 'succeeded' }] })).toBe(true)
    expect(orderHasPaid({ payment_status: 'pending' })).toBe(false)
  })
})
