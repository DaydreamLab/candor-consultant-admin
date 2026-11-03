import { describe, expect, it } from 'vitest'
import {
  isOrderShipmentRefundable,
  isRefundRequestBlockingPicking,
  orderHasRefundableCardPayment
} from './order-refund-gate'

describe('order-refund-gate', () => {
  it('allows refund only when shipment is missing (C15)', () => {
    expect(isOrderShipmentRefundable(null)).toBe(true)
    expect(isOrderShipmentRefundable(undefined)).toBe(true)
    expect(isOrderShipmentRefundable({})).toBe(false)
    expect(isOrderShipmentRefundable({ status: 'picking' })).toBe(false)
    expect(isOrderShipmentRefundable({ status: 'in_transit' })).toBe(false)
  })

  it('blocks picking while refund request is requested (B-17)', () => {
    expect(isRefundRequestBlockingPicking('requested')).toBe(true)
    expect(isRefundRequestBlockingPicking('refunded')).toBe(false)
    expect(isRefundRequestBlockingPicking('rejected')).toBe(false)
    expect(isRefundRequestBlockingPicking(null)).toBe(false)
  })

  it('detects succeeded card payments', () => {
    expect(orderHasRefundableCardPayment([
      { status: 'succeeded', method: 'card' }
    ])).toBe(true)
    expect(orderHasRefundableCardPayment([
      { status: 'succeeded', method: 'atm' }
    ])).toBe(false)
  })
})
