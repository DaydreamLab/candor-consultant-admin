import type { ApiShipStatus } from '~/types/admin'
import { mapApiShipStatus } from '~/utils/shipment-map'

/** B-17／前台時間軸：已付款且尚無出貨記錄 →「訂單確認中」（非新 API status）。 */
export type ShippingPhaseKey = 'order_confirmed' | 'picking' | 'in_transit' | 'arrived'

export function orderHasPaid(order: Record<string, unknown> | null | undefined): boolean {
  if (!order) {
    return false
  }
  if (order.payment_status === 'paid') {
    return true
  }
  const payments = Array.isArray(order.payments) ? order.payments : []
  return payments.some((row) => {
    return Boolean(row)
      && typeof row === 'object'
      && !Array.isArray(row)
      && (row as Record<string, unknown>).status === 'succeeded'
  })
}

export function orderShipmentRecord(
  order: Record<string, unknown> | null | undefined,
  shipment: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (shipment && typeof shipment === 'object') {
    return shipment
  }
  if (!order) {
    return null
  }
  const nested = order.shipment
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return null
}

/**
 * Resolve display phase for shipping detail.
 * - No shipment row + paid → order_confirmed（訂單確認中）
 * - Else map shipment API status
 */
export function resolveShippingPhase(
  order: Record<string, unknown> | null | undefined,
  shipment: Record<string, unknown> | null | undefined
): ShippingPhaseKey | null {
  const ship = orderShipmentRecord(order, shipment)
  if (!ship) {
    return orderHasPaid(order) ? 'order_confirmed' : null
  }
  const status = mapApiShipStatus(ship.status)
  if (status === 'picking' || status === 'in_transit' || status === 'arrived') {
    return status
  }
  // shipment exists but status not yet picking/in_transit/arrived → still 理貨前
  return orderHasPaid(order) ? 'order_confirmed' : null
}

export function shippingPhaseSteps(): ShippingPhaseKey[] {
  return ['order_confirmed', 'picking', 'in_transit', 'arrived']
}

export function apiStatusFromPhase(phase: ShippingPhaseKey | null): ApiShipStatus | null {
  if (phase === 'picking' || phase === 'in_transit' || phase === 'arrived') {
    return phase
  }
  return null
}
