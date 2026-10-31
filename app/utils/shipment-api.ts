import type { ShipmentRow } from '~/types/admin'
import { AdminApiError } from '~/utils/admin-api'
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

/** GET /admin/shipments */
export async function adminListShipments(
  apiBase: string,
  token: string,
  query: {
    q?: string
    status?: string
    from?: string
    to?: string
    limit?: number
    offset?: number
  } = {}
): Promise<ShipmentRow[]> {
  const data = await adminFetchSuccess(apiBase, token, '/shipments', {
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
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
