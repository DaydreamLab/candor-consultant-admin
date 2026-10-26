import { describe, expect, it } from 'vitest'
import { shippingProgressQuery } from './shipping-link'

describe('shippingProgressQuery', () => {
  it('prefers order_no for q and shipment id for highlight', () => {
    expect(shippingProgressQuery({
      shipmentId: 'shp_1',
      orderNo: 'ORD-1001',
      trackingNo: 'SF1',
      orderId: 'ord_9'
    })).toEqual({
      shipment: 'shp_1',
      q: 'ORD-1001'
    })
  })

  it('falls back tracking then order id', () => {
    expect(shippingProgressQuery({
      trackingNo: 'SF1',
      orderId: 'ord_9'
    })).toEqual({ q: 'SF1' })

    expect(shippingProgressQuery({
      orderId: 'ord_9'
    })).toEqual({ q: 'ord_9' })
  })

  it('omits empty keys', () => {
    expect(shippingProgressQuery({
      shipmentId: '  ',
      orderNo: null
    })).toEqual({})
  })
})
