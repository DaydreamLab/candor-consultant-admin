import { describe, expect, it } from 'vitest'
import { isOrderShipmentRefundable, orderHasRefundableCardPayment } from './order-refund-gate'

describe('order-refund-gate', () => {
  it('allows refund when shipment is missing or picking', () => {
    expect(isOrderShipmentRefundable(null)).toBe(true)
    expect(isOrderShipmentRefundable(undefined)).toBe(true)
    expect(isOrderShipmentRefundable({})).toBe(true)
    expect(isOrderShipmentRefundable({ status: 'picking' })).toBe(true)
  })

  it('blocks refund after shipment leaves picking', () => {
    expect(isOrderShipmentRefundable({ status: 'in_transit' })).toBe(false)
    expect(isOrderShipmentRefundable({ status: 'arrived' })).toBe(false)
  })

  it('detects succeeded card payments', () => {
    expect(orderHasRefundableCardPayment([
      { status: 'succeeded', method: 'card' }
    ])).toBe(true)
    expect(orderHasRefundableCardPayment([
      { status: 'succeeded', method: 'atm' }
    ])).toBe(false)
    expect(orderHasRefundableCardPayment(null)).toBe(false)
  })
})
