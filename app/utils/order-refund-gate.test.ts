import { describe, expect, it } from 'vitest'
import {
  isOrderShipmentRefundable,
  isRefundRequestBlockingPicking,
  orderBlocksPickingDueToRefund,
  orderRefundStatus
} from './order-refund-gate'

describe('order-refund-gate', () => {
  it('allows refund only when shipment is missing (C15)', () => {
    expect(isOrderShipmentRefundable(null)).toBe(true)
    expect(isOrderShipmentRefundable(undefined)).toBe(true)
    expect(isOrderShipmentRefundable({ status: 'picking' })).toBe(false)
    expect(isOrderShipmentRefundable({ status: '' })).toBe(false)
  })

  it('blocks picking while refund request is requested (B-17)', () => {
    expect(isRefundRequestBlockingPicking('requested')).toBe(true)
    expect(isRefundRequestBlockingPicking('refunded')).toBe(false)
    expect(isRefundRequestBlockingPicking('rejected')).toBe(false)
    expect(isRefundRequestBlockingPicking(null)).toBe(false)
  })

  it('reads core refund_status first (fallback refund_request_status)', () => {
    expect(orderRefundStatus({ refund_status: 'requested' })).toBe('requested')
    expect(orderRefundStatus({ refund_request_status: 'requested' })).toBe('requested')
    expect(orderRefundStatus({
      refund_status: 'rejected',
      refund_request_status: 'requested'
    })).toBe('rejected')
    expect(orderBlocksPickingDueToRefund({ refund_status: 'requested' })).toBe(true)
    expect(orderBlocksPickingDueToRefund({ refund_status: 'rejected' })).toBe(false)
  })
})
