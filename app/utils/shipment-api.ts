import type { ShipmentRow } from '~/types/admin'
import {
  AdminApiError,
  adminGetOrder,
  adminListOrders
} from '~/utils/admin-api'
import {
  mapAdminShipmentToRow,
  readShipmentListPayload
} from '~/utils/shipment-map'
import type { AdminFailure, AdminSuccess } from '~/types/operator'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function adminUrl(apiBase: string, path: string) {
  const base = apiBase.replace(/\/$/, '')
  return `${base}/admin${path}`
}

function readStatus(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 0
  }
  const record = error as { statusCode?: number, status?: number }
  const statusCode = Number(record.statusCode ?? record.status)
  return Number.isFinite(statusCode) ? statusCode : 0
}

function readMessage(error: unknown) {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return ''
  }
  const data = (error as { data?: AdminFailure }).data
  return typeof data?.error_message === 'string' ? data.error_message : ''
}

function isUnavailable(error: unknown) {
  const status = error instanceof AdminApiError ? error.statusCode : readStatus(error)
  return status === 0 || status === 404 || status === 405 || status === 501 || status === 503
}

async function adminFetchSuccess(
  apiBase: string,
  token: string,
  path: string,
  query?: Record<string, string | number>
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, path), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return body.data
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

/** GET /admin/shipments — core #88 list when deployed. */
export async function adminListShipments(
  apiBase: string,
  token: string,
  query: { q?: string, status?: string, limit?: number, offset?: number } = {}
): Promise<ShipmentRow[]> {
  const data = await adminFetchSuccess(apiBase, token, '/shipments', {
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(typeof query.limit === 'number' ? { limit: query.limit } : {}),
    ...(typeof query.offset === 'number' ? { offset: query.offset } : {})
  })
  const rows = readShipmentListPayload(data)
    .map(row => mapAdminShipmentToRow(row))
    .filter((row): row is ShipmentRow => Boolean(row))
  return rows
}

/** GET /admin/shipment/{id} */
export async function adminGetShipment(
  apiBase: string,
  token: string,
  id: string
): Promise<ShipmentRow | null> {
  const data = await adminFetchSuccess(apiBase, token, `/shipment/${encodeURIComponent(id)}`)
  if (!isRecord(data)) {
    throw new AdminApiError(500, '')
  }
  return mapAdminShipmentToRow(data)
}

/** GET /admin/order/{id}/shipment — may 405 until core exposes GET. */
export async function adminGetOrderShipment(
  apiBase: string,
  token: string,
  orderId: string
): Promise<ShipmentRow | null> {
  const data = await adminFetchSuccess(
    apiBase,
    token,
    `/order/${encodeURIComponent(orderId)}/shipment`
  )
  if (!isRecord(data)) {
    throw new AdminApiError(500, '')
  }
  const ship = isRecord(data.shipment) ? data.shipment : data
  if (!isRecord(ship)) {
    throw new AdminApiError(500, '')
  }
  const order = isRecord(data.order) ? data.order : { id: orderId }
  return mapAdminShipmentToRow(ship, order)
}

function orderHasShipmentHint(order: Record<string, unknown>) {
  if (isRecord(order.shipment)) {
    return true
  }
  const shipId = order.shipment_id
  return typeof shipId === 'string'
    ? Boolean(shipId.trim())
    : typeof shipId === 'number' && Number.isFinite(shipId)
}

/**
 * Prefer GET /admin/shipments; if unavailable/empty, derive from orders that
 * expose shipment_id / nested shipment (core #88). Never invent endpoints.
 */
export async function loadAdminShippingRows(
  apiBase: string,
  token: string
): Promise<{ rows: ShipmentRow[], source: 'shipments' | 'orders' | 'empty' }> {
  try {
    const listed = await adminListShipments(apiBase, token, { limit: 100 })
    if (listed.length) {
      return { rows: listed, source: 'shipments' }
    }
  } catch (error) {
    if (!isUnavailable(error)) {
      throw error
    }
  }

  const fromOrders = await loadShipmentsFromOrders(apiBase, token)
  if (fromOrders.length) {
    return { rows: fromOrders, source: 'orders' }
  }
  return { rows: [], source: 'empty' }
}

async function loadShipmentsFromOrders(
  apiBase: string,
  token: string
): Promise<ShipmentRow[]> {
  const orders = await adminListOrders(apiBase, token, { limit: 50, offset: 0 })
  const byId = new Map<string, ShipmentRow>()

  for (const order of orders) {
    if (!isRecord(order)) {
      continue
    }
    const nested = isRecord(order.shipment) ? order.shipment : null
    if (nested) {
      const mapped = mapAdminShipmentToRow(nested, order)
      if (mapped) {
        byId.set(mapped.id, mapped)
      }
      continue
    }
    if (!orderHasShipmentHint(order)) {
      continue
    }

    const orderId = typeof order.id === 'string' || typeof order.id === 'number'
      ? String(order.id)
      : ''
    if (!orderId) {
      continue
    }

    try {
      const viaNested = await adminGetOrderShipment(apiBase, token, orderId)
      if (viaNested) {
        byId.set(viaNested.id, viaNested)
        continue
      }
    } catch (error) {
      if (!isUnavailable(error)) {
        // keep trying order detail
      }
    }

    try {
      const detail = await adminGetOrder(apiBase, token, orderId)
      if (!isRecord(detail)) {
        continue
      }
      const ship = isRecord(detail.shipment) ? detail.shipment : null
      if (!ship) {
        continue
      }
      const mapped = mapAdminShipmentToRow(ship, detail)
      if (mapped) {
        byId.set(mapped.id, mapped)
      }
    } catch {
      // skip this order
    }
  }

  return [...byId.values()]
}
