/**
 * Align with core OrderService::refundSucceededPayment:
 * shipment must be null or status `picking`; otherwise not refundable (already shipped).
 */
export function isOrderShipmentRefundable(shipment: Record<string, unknown> | null | undefined): boolean {
  if (!shipment) {
    return true
  }
  const status = typeof shipment.status === 'string' ? shipment.status.trim() : ''
  if (!status) {
    return true
  }
  return status === 'picking'
}

export function orderHasRefundableCardPayment(payments: unknown): boolean {
  if (!Array.isArray(payments)) {
    return false
  }
  return payments.some((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return false
    }
    const payment = row as Record<string, unknown>
    return payment.status === 'succeeded' && payment.method === 'card'
  })
}
