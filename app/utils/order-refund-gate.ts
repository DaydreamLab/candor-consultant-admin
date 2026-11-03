/**
 * C15 / DESIGN rule 22：開始理貨後不可退。
 * shipment 必須尚未建立（null）；一進入 picking／之後皆不可退。
 */
export function isOrderShipmentRefundable(shipment: Record<string, unknown> | null | undefined): boolean {
  if (!shipment) {
    return true
  }
  const status = typeof shipment.status === 'string' ? shipment.status.trim() : ''
  // 有 shipment 列即視為已開始履約／理貨流程 → 不可退
  if (!status) {
    return false
  }
  return false
}

/** True when a refund request is still open (blocks 開始理貨 — B-17 / C19). */
export function isRefundRequestBlockingPicking(status: unknown): boolean {
  return typeof status === 'string' && status.trim() === 'requested'
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
