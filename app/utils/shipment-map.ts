import type { ShipStatus, ShipmentEvent, ShipmentRow } from '~/types/admin'
import { SHIP_FLOW } from '~/utils/demo'
import { formatLocalDateTime } from '~/utils/format-local-datetime'

/** Map core shipment.status (and aliases) onto admin UI ShipStatus. */
export function mapShipStatus(raw: unknown): ShipStatus | null {
  if (typeof raw !== 'string') {
    return null
  }
  const value = raw.trim().toLowerCase()
  if (value === 'picking' || value === 'labeling' || value === 'in_transit' || value === 'delivered') {
    return value
  }
  if (value === 'arrived' || value === 'delivered_at' || value === 'complete' || value === 'completed') {
    return 'delivered'
  }
  if (value === 'shipped' || value === 'shipping' || value === 'transit') {
    return 'in_transit'
  }
  if (value === 'label' || value === 'labelled' || value === 'labeled') {
    return 'labeling'
  }
  if (value === 'pick' || value === 'picked') {
    return 'picking'
  }
  return null
}

export function displayOrderNo(row: Pick<ShipmentRow, 'caseId' | 'orderNo'>): string {
  const orderNo = typeof row.orderNo === 'string' ? row.orderNo.trim() : ''
  if (orderNo) {
    return orderNo
  }
  return orderNoFromCaseIdLocal(row.caseId)
}

function orderNoFromCaseIdLocal(caseId: string): string {
  const match = /^C-(.+)$/i.exec(caseId.trim())
  if (!match?.[1]) {
    return caseId
  }
  return `ORD-${match[1]}`
}

export function shipmentSearchHaystack(row: ShipmentRow): string {
  return [
    row.customer,
    row.caseId,
    displayOrderNo(row),
    row.orderId ?? '',
    row.orderNo ?? '',
    row.id,
    row.tracking ?? ''
  ].join(' ').toLowerCase()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function scalarText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function timeText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return scalarText(value)
  }
  return formatLocalDateTime(value, { style: 'full', empty: '' })
}

function recipientName(order: Record<string, unknown> | null | undefined): string {
  if (!order) {
    return ''
  }
  const recipient = isRecord(order.recipient) ? order.recipient : null
  return scalarText(recipient?.name)
    || scalarText(order.recipient_name)
    || scalarText(order.customer_name)
    || scalarText(order.customer)
}

function itemsFromOrder(order: Record<string, unknown> | null | undefined): { sku: string, qty: number }[] {
  if (!order) {
    return []
  }
  const items: { sku: string, qty: number }[] = []
  const pkg = isRecord(order.package) ? order.package : null
  const components = Array.isArray(pkg?.components) ? pkg.components : []
  for (const raw of components) {
    if (!isRecord(raw)) {
      continue
    }
    const sku = scalarText(raw.sku) || scalarText(raw.sellable_item_sku) || scalarText(raw.name)
    const qtyRaw = raw.qty ?? raw.quantity ?? raw.daily_dose
    const qty = typeof qtyRaw === 'number' && Number.isFinite(qtyRaw) ? qtyRaw : Number(qtyRaw)
    if (!sku) {
      continue
    }
    items.push({ sku, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 })
  }
  if (items.length) {
    return items
  }
  const daySupplies = Array.isArray(order.day_supplies) ? order.day_supplies : []
  for (const raw of daySupplies) {
    if (!isRecord(raw)) {
      continue
    }
    const sku = scalarText(raw.sku) || scalarText(raw.name)
    const qtyRaw = raw.qty ?? raw.quantity
    const qty = typeof qtyRaw === 'number' && Number.isFinite(qtyRaw) ? qtyRaw : Number(qtyRaw)
    if (!sku) {
      continue
    }
    items.push({ sku, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 })
  }
  return items
}

function itemsFromShipment(ship: Record<string, unknown>): { sku: string, qty: number }[] {
  const rawItems = Array.isArray(ship.items) ? ship.items : Array.isArray(ship.lines) ? ship.lines : []
  const items: { sku: string, qty: number }[] = []
  for (const raw of rawItems) {
    if (!isRecord(raw)) {
      continue
    }
    const sku = scalarText(raw.sku) || scalarText(raw.sellable_item_sku) || scalarText(raw.name)
    const qtyRaw = raw.qty ?? raw.quantity
    const qty = typeof qtyRaw === 'number' && Number.isFinite(qtyRaw) ? qtyRaw : Number(qtyRaw)
    if (!sku) {
      continue
    }
    items.push({ sku, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 })
  }
  return items
}

function eventsFromShipment(ship: Record<string, unknown>, status: ShipStatus): ShipmentEvent[] {
  const rawEvents = Array.isArray(ship.events) ? ship.events : Array.isArray(ship.timeline) ? ship.timeline : []
  const parsed: ShipmentEvent[] = []
  for (const raw of rawEvents) {
    if (!isRecord(raw)) {
      continue
    }
    const eventStatus = mapShipStatus(raw.status ?? raw.state)
    const at = timeText(raw.at ?? raw.time ?? raw.timestamp ?? raw.created_at)
    if (!eventStatus || !at) {
      continue
    }
    parsed.push({ status: eventStatus, at })
  }
  if (parsed.length) {
    return parsed
  }

  const derived: ShipmentEvent[] = []
  const pickingAt = timeText(ship.picked_at ?? ship.picking_at ?? ship.created_at)
  const labelingAt = timeText(ship.labeling_at ?? ship.labelled_at ?? ship.labeled_at)
  const shippedAt = timeText(ship.shipped_at)
  const deliveredAt = timeText(ship.arrived_at ?? ship.delivered_at)

  const stamp: Partial<Record<ShipStatus, string>> = {
    picking: pickingAt,
    labeling: labelingAt,
    in_transit: shippedAt,
    delivered: deliveredAt
  }

  const currentIndex = SHIP_FLOW.indexOf(status)
  for (let i = 0; i <= currentIndex; i += 1) {
    const step = SHIP_FLOW[i]!
    const at = stamp[step]
    if (at) {
      derived.push({ status: step, at })
    }
  }
  return derived
}

/**
 * Map an admin shipment payload (+ optional parent order) to the table row model.
 * Tolerant of draft core #88 shapes: shipment_id / order_id / order_no / tracking_no.
 */
export function mapAdminShipmentToRow(
  ship: Record<string, unknown>,
  order?: Record<string, unknown> | null
): ShipmentRow | null {
  const id = scalarText(ship.id) || scalarText(ship.shipment_id)
  if (!id) {
    return null
  }

  const status = mapShipStatus(ship.status) ?? 'picking'
  const orderId = scalarText(ship.order_id)
    || scalarText(order?.id)
    || scalarText(ship.orderId)
  const orderNo = scalarText(ship.order_no)
    || scalarText(order?.order_no)
    || scalarText(ship.orderNo)
  const tracking = scalarText(ship.tracking_no)
    || scalarText(ship.tracking)
    || null
  const shippedAt = timeText(ship.shipped_at) || null
  const customer = recipientName(order)
    || scalarText(ship.customer)
    || scalarText(ship.recipient_name)
    || orderNo
    || id
  const items = itemsFromShipment(ship)
  const fallbackItems = items.length ? items : itemsFromOrder(order ?? null)

  return {
    id,
    caseId: orderId || orderNo || id,
    orderId: orderId || null,
    orderNo: orderNo || null,
    orgId: scalarText(ship.org_id) || scalarText(order?.org_id) || '',
    customer,
    status,
    tracking: tracking || null,
    shippedAt,
    items: fallbackItems,
    events: eventsFromShipment(ship, status),
    source: 'api'
  }
}

export function readShipmentListPayload(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }
  if (!isRecord(data)) {
    return []
  }
  for (const key of ['shipments', 'items', 'rows', 'data']) {
    const nested = data[key]
    if (Array.isArray(nested)) {
      return nested.filter(isRecord)
    }
  }
  const firstArray = Object.values(data).find((value): value is unknown[] => Array.isArray(value))
  return firstArray ? firstArray.filter(isRecord) : []
}
