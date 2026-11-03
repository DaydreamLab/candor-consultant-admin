/**
 * C15 / DESIGN rule 22：開始理貨後不可退。
 * core #143：定稿不自動建 shipment；shipment 必須尚未建立（null）。
 */
export function isOrderShipmentRefundable(shipment: Record<string, unknown> | null | undefined): boolean {
  if (!shipment) {
    return true
  }
  // 有 shipment 列即視為已開始履約／理貨流程 → 不可退
  return false
}

/**
 * core order 退款申請狀態欄位（#143）：優先 `refund_status`，
 * 過渡相容舊 mock 的 `refund_request_status`。
 */
export function orderRefundStatus(order: Record<string, unknown> | null | undefined): string {
  if (!order) {
    return ''
  }
  const raw = order.refund_status ?? order.refund_request_status
  return typeof raw === 'string' ? raw.trim() : ''
}

/** True when a refund request is still open (blocks 開始理貨 — B-17／C19／`refund_request_pending`). */
export function isRefundRequestBlockingPicking(status: unknown): boolean {
  return typeof status === 'string' && status.trim() === 'requested'
}

export function orderBlocksPickingDueToRefund(order: Record<string, unknown> | null | undefined): boolean {
  return isRefundRequestBlockingPicking(orderRefundStatus(order))
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
