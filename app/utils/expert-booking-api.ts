import type { AdminFailure, AdminSuccess } from '~/types/operator'
import { AdminApiError } from '~/utils/admin-api'
import {
  createExpertBookingFixtureStore,
  EXPERT_BOOKING_SELLABLE_OPTIONS,
  type ExpertBookingFixtureStore
} from '~/utils/expert-booking-fixtures'
import type {
  ExpertBookingDetail,
  ExpertBookingListResult,
  ExpertBookingProductReason,
  ExpertBookingSellableOption,
  ExpertBookingServiceRecord,
  ExpertBookingStatus,
  ExpertCalendarSnapshot,
  ExpertDayAvailabilityOverride,
  ExpertServiceMethod,
  ExpertWeeklyAvailabilityRule
} from '~/utils/expert-booking-types'

/**
 * Assumed Admin / Expert-station API shape (pending candor-core expert-booking PR).
 * Paths are centralized here so core merge only needs client path tweaks.
 *
 * Admin (ops／admin／expert read; cancel／selections write for ops／admin):
 * - GET    /api/v1/admin/expert-bookings?page&page_size
 * - GET    /api/v1/admin/expert-booking/{id}
 * - POST   /api/v1/admin/expert-booking/{id}/cancel
 * - PUT    /api/v1/admin/expert-booking/{id}/product-reasons
 *
 * Expert station (expert role only; same operator JWT):
 * - GET    /api/v1/admin/expert-station/bookings?page&page_size
 * - POST   /api/v1/admin/expert-station/bookings/{id}/pin { pinned }
 * - POST   /api/v1/admin/expert-station/bookings/{id}/seen
 * - GET    /api/v1/admin/expert-station/bookings/{id}
 * - GET    /api/v1/admin/expert-station/bookings/{id}/conversations?before&limit
 * - PUT    /api/v1/admin/expert-station/bookings/{id}/confirm { confirmed_at }
 * - PUT    /api/v1/admin/expert-station/bookings/{id}/service-record
 * - PUT    /api/v1/admin/expert-station/bookings/{id}/product-reasons
 * - POST   /api/v1/admin/expert-station/bookings/{id}/complete
 * - GET    /api/v1/admin/expert-station/calendar?from&to
 * - PUT    /api/v1/admin/expert-station/calendar/weekly-rules
 * - PUT    /api/v1/admin/expert-station/calendar/day-override
 * - DELETE /api/v1/admin/expert-station/calendar/day-override?expert_id&date
 * - GET    /api/v1/admin/sellable-items?sale_status=on_sale（選品清單複用既有）
 */

/** Default ON locally until core expert-booking API merges. */
export function isExpertBookingMockEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().public.expertBookingMock)
  } catch {
    return process.env.NUXT_PUBLIC_EXPERT_BOOKING_MOCK !== '0'
  }
}

let fixtureStore: ExpertBookingFixtureStore | null = null

function store(): ExpertBookingFixtureStore {
  if (!fixtureStore) {
    fixtureStore = createExpertBookingFixtureStore()
  }
  return fixtureStore
}

/** Test-only reset. */
export function resetExpertBookingMockStore() {
  fixtureStore = createExpertBookingFixtureStore()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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

function adminUrl(apiBase: string, path: string) {
  const base = apiBase.replace(/\/$/, '')
  return `${base}/admin${path.startsWith('/') ? path : `/${path}`}`
}

type AdminFetchMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function adminFetch<T>(
  apiBase: string,
  token: string,
  path: string,
  init?: { method?: AdminFetchMethod, body?: object }
): Promise<T> {
  try {
    const method = init?.method || 'GET'
    const res = await $fetch<AdminSuccess<T>>(adminUrl(apiBase, path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`
      },
      ...(init?.body !== undefined ? { body: init.body } : {})
    })
    return res.data
  } catch (error) {
    throw new AdminApiError(readStatus(error) || 500, readMessage(error) || 'request_failed')
  }
}

function listItemFromDetail(detail: ExpertBookingDetail) {
  const {
    need_description: _n,
    contact_email: _e,
    contact_phone: _p,
    contact_line: _l,
    profile: _pr,
    product_reasons: _pr2,
    service_record: _sr,
    conversations: _c,
    conversations_has_more: _h,
    ...item
  } = detail
  return item
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, page)
  const safeSize = Math.min(100, Math.max(1, pageSize))
  const start = (safePage - 1) * safeSize
  return {
    page: safePage,
    page_size: safeSize,
    total: items.length,
    items: items.slice(start, start + safeSize)
  }
}

function applyPins(
  items: ExpertBookingDetail[],
  expertId: string | null
): ExpertBookingListResult['items'] {
  const s = store()
  return items.map((row) => {
    const pinned = expertId ? s.isPinned(expertId, row.id) : row.pinned
    return { ...listItemFromDetail(row), pinned }
  }).sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1
    }
    return b.paid_at.localeCompare(a.paid_at)
  })
}

function lastSeenPayload(expertId: string | null) {
  if (!expertId) {
    return null
  }
  const s = store()
  const seen = s.lastSeenByExpert[expertId]
  if (!seen) {
    return null
  }
  const detail = s.details.get(seen.booking_id)
  if (!detail) {
    return null
  }
  return {
    booking_id: detail.id,
    order_code: detail.order_code,
    member_name: detail.member_name,
    status: detail.status,
    seen_at: seen.seen_at
  }
}

export async function listAdminExpertBookings(
  apiBase: string,
  token: string,
  opts: { page?: number, page_size?: number } = {}
): Promise<ExpertBookingListResult> {
  if (isExpertBookingMockEnabled()) {
    const s = store()
    const paid = [...s.details.values()].filter(d => d.payment_status === 'paid')
    const page = paginate(applyPins(paid, null), opts.page ?? 1, opts.page_size ?? 20)
    return { ...page, last_seen: null }
  }
  const q = new URLSearchParams()
  q.set('page', String(opts.page ?? 1))
  q.set('page_size', String(opts.page_size ?? 20))
  return adminFetch(apiBase, token, `/expert-bookings?${q}`)
}

export async function getAdminExpertBooking(
  apiBase: string,
  token: string,
  id: string
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-booking/${encodeURIComponent(id)}`)
}

export async function cancelAdminExpertBooking(
  apiBase: string,
  token: string,
  id: string
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    if (row.status === 'cancelled') {
      throw new AdminApiError(409, 'already_cancelled')
    }
    if (row.status === 'completed') {
      throw new AdminApiError(409, 'already_completed')
    }
    row.status = 'cancelled'
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-booking/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: {}
  })
}

export async function putAdminExpertBookingProductReasons(
  apiBase: string,
  token: string,
  id: string,
  productReasons: ExpertBookingProductReason[]
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    row.product_reasons = productReasons.map(p => ({ ...p }))
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-booking/${encodeURIComponent(id)}/product-reasons`, {
    method: 'PUT',
    body: { product_reasons: productReasons }
  })
}

export async function listExpertStationBookings(
  apiBase: string,
  token: string,
  expertId: string,
  opts: { page?: number, page_size?: number } = {}
): Promise<ExpertBookingListResult> {
  if (isExpertBookingMockEnabled()) {
    const s = store()
    const paid = [...s.details.values()].filter(
      d => d.payment_status === 'paid' && d.status !== 'cancelled'
    )
    const page = paginate(applyPins(paid, expertId), opts.page ?? 1, opts.page_size ?? 20)
    return { ...page, last_seen: lastSeenPayload(expertId) }
  }
  const q = new URLSearchParams()
  q.set('page', String(opts.page ?? 1))
  q.set('page_size', String(opts.page_size ?? 20))
  return adminFetch(apiBase, token, `/expert-station/bookings?${q}`)
}

export async function pinExpertStationBooking(
  apiBase: string,
  token: string,
  expertId: string,
  id: string,
  pinned: boolean
): Promise<void> {
  if (isExpertBookingMockEnabled()) {
    store().togglePin(expertId, id, pinned)
    return
  }
  await adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}/pin`, {
    method: 'POST',
    body: { pinned }
  })
}

export async function markExpertStationBookingSeen(
  apiBase: string,
  token: string,
  expertId: string,
  id: string
): Promise<void> {
  if (isExpertBookingMockEnabled()) {
    if (!store().details.has(id)) {
      throw new AdminApiError(404, 'not_found')
    }
    store().setLastSeen(expertId, id)
    return
  }
  await adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}/seen`, {
    method: 'POST',
    body: {}
  })
}

export async function getExpertStationBooking(
  apiBase: string,
  token: string,
  expertId: string,
  id: string
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    store().setLastSeen(expertId, id)
    return structuredClone({
      ...row,
      pinned: store().isPinned(expertId, id)
    })
  }
  return adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}`)
}

export async function confirmExpertStationBooking(
  apiBase: string,
  token: string,
  expertId: string,
  id: string,
  confirmedAt: string
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    row.confirmed_at = confirmedAt
    if (row.status === 'pending_schedule') {
      row.status = 'scheduled'
    }
    const expert = store().calendar.experts.find(e => e.id === expertId)
    row.annotated_expert_id = expertId
    row.annotated_expert_name = expert?.name ?? row.annotated_expert_name
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}/confirm`, {
    method: 'PUT',
    body: { confirmed_at: confirmedAt }
  })
}

export async function putExpertStationServiceRecord(
  apiBase: string,
  token: string,
  expertId: string,
  id: string,
  record: Omit<ExpertBookingServiceRecord, 'updated_by_operator_id' | 'updated_by_name' | 'updated_at'>
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    const expert = store().calendar.experts.find(e => e.id === expertId)
    row.service_record = {
      ...record,
      updated_by_operator_id: expertId,
      updated_by_name: expert?.name ?? null,
      updated_at: new Date().toISOString()
    }
    return structuredClone(row)
  }
  return adminFetch(
    apiBase,
    token,
    `/expert-station/bookings/${encodeURIComponent(id)}/service-record`,
    { method: 'PUT', body: record }
  )
}

export async function putExpertStationProductReasons(
  apiBase: string,
  token: string,
  id: string,
  productReasons: ExpertBookingProductReason[]
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    row.product_reasons = productReasons.map(p => ({ ...p }))
    return structuredClone(row)
  }
  return adminFetch(
    apiBase,
    token,
    `/expert-station/bookings/${encodeURIComponent(id)}/product-reasons`,
    { method: 'PUT', body: { product_reasons: productReasons } }
  )
}

export async function completeExpertStationBooking(
  apiBase: string,
  token: string,
  id: string
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    if (row.status === 'cancelled') {
      throw new AdminApiError(409, 'cancelled')
    }
    row.status = 'completed'
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: {}
  })
}

export async function getExpertStationCalendar(
  apiBase: string,
  token: string,
  _range?: { from: string, to: string }
): Promise<ExpertCalendarSnapshot> {
  if (isExpertBookingMockEnabled()) {
    return structuredClone(store().calendar)
  }
  const q = new URLSearchParams()
  if (_range?.from) {
    q.set('from', _range.from)
  }
  if (_range?.to) {
    q.set('to', _range.to)
  }
  const suffix = q.toString() ? `?${q}` : ''
  return adminFetch(apiBase, token, `/expert-station/calendar${suffix}`)
}

export async function putExpertStationWeeklyRules(
  apiBase: string,
  token: string,
  expertId: string,
  operatorName: string,
  rules: ExpertWeeklyAvailabilityRule[]
): Promise<ExpertCalendarSnapshot> {
  if (isExpertBookingMockEnabled()) {
    const cal = store().calendar
    cal.weekly_rules = [
      ...cal.weekly_rules.filter(r => r.expert_id !== expertId),
      ...rules.filter(r => r.expert_id === expertId)
    ]
    cal.last_modified_by_name = operatorName
    cal.last_modified_at = new Date().toISOString()
    return structuredClone(cal)
  }
  return adminFetch(apiBase, token, '/expert-station/calendar/weekly-rules', {
    method: 'PUT',
    body: { expert_id: expertId, rules }
  })
}

export async function putExpertStationDayOverride(
  apiBase: string,
  token: string,
  override: ExpertDayAvailabilityOverride
): Promise<ExpertCalendarSnapshot> {
  if (isExpertBookingMockEnabled()) {
    const cal = store().calendar
    cal.day_overrides = [
      ...cal.day_overrides.filter(
        o => !(o.expert_id === override.expert_id && o.date === override.date)
      ),
      { ...override }
    ]
    cal.last_modified_by_name = override.updated_by_name
    cal.last_modified_at = override.updated_at
    return structuredClone(cal)
  }
  return adminFetch(apiBase, token, '/expert-station/calendar/day-override', {
    method: 'PUT',
    body: override
  })
}

export async function deleteExpertStationDayOverride(
  apiBase: string,
  token: string,
  expertId: string,
  date: string,
  operatorName: string
): Promise<ExpertCalendarSnapshot> {
  if (isExpertBookingMockEnabled()) {
    const cal = store().calendar
    cal.day_overrides = cal.day_overrides.filter(
      o => !(o.expert_id === expertId && o.date === date)
    )
    cal.last_modified_by_name = operatorName
    cal.last_modified_at = new Date().toISOString()
    return structuredClone(cal)
  }
  const q = new URLSearchParams({ expert_id: expertId, date })
  return adminFetch(apiBase, token, `/expert-station/calendar/day-override?${q}`, {
    method: 'DELETE'
  })
}

export async function listExpertBookingSellableOptions(
  apiBase: string,
  token: string
): Promise<ExpertBookingSellableOption[]> {
  if (isExpertBookingMockEnabled()) {
    return EXPERT_BOOKING_SELLABLE_OPTIONS.map(o => ({ ...o }))
  }
  // Reuse sellable-items list when live; keep shape narrow for picker.
  const data = await adminFetch<{ items?: unknown[] } | unknown[]>(
    apiBase,
    token,
    '/sellable-items?sale_status=on_sale&page_size=100'
  )
  const rows = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : [])
  return rows.flatMap((row) => {
    if (!isRecord(row) || typeof row.id !== 'string') {
      return []
    }
    return [{
      id: row.id,
      name_zh: typeof row.name_zh === 'string' ? row.name_zh : row.id,
      name_en: typeof row.name_en === 'string' ? row.name_en : '',
      sku: typeof row.sku === 'string' ? row.sku : null
    }]
  })
}

export function statusBadgeColor(status: ExpertBookingStatus): 'warning' | 'info' | 'success' | 'neutral' {
  switch (status) {
    case 'pending_schedule':
      return 'warning'
    case 'scheduled':
      return 'info'
    case 'completed':
      return 'success'
    default:
      return 'neutral'
  }
}

export function parseServiceMethod(value: unknown): ExpertServiceMethod {
  if (value === 'phone' || value === 'online_meeting' || value === 'in_person' || value === 'other') {
    return value
  }
  return 'phone'
}
