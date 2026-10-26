/** Build `/shipping` query so list search + row highlight match a real order. */
export function shippingProgressQuery(input: {
  shipmentId?: string | null
  orderNo?: string | null
  trackingNo?: string | null
  orderId?: string | null
}): Record<string, string> {
  const query: Record<string, string> = {}
  const shipmentId = trimText(input.shipmentId)
  const orderNo = trimText(input.orderNo)
  const trackingNo = trimText(input.trackingNo)
  const orderId = trimText(input.orderId)

  if (shipmentId) {
    query.shipment = shipmentId
  }

  if (orderNo) {
    query.q = orderNo
  } else if (trackingNo) {
    query.q = trackingNo
  } else if (orderId) {
    query.q = orderId
  }

  return query
}

function trimText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}
