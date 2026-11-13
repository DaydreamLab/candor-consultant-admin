import type { AdminFailure, AdminSuccess } from '~/types/operator'
import { AdminApiError } from '~/utils/admin-api'
import {
  createExpertBookingFixtureStore,
  EXPERT_BOOKING_SELLABLE_OPTIONS,
  type ExpertBookingFixtureStore
} from '~/utils/expert-booking-fixtures'
import type {
  ExpertBookingAttachment,
  ExpertBookingAttachmentContentType,
  ExpertBookingConversationsResult,
  ExpertBookingDetail,
  ExpertBookingListResult,
  ExpertBookingProductPick,
  ExpertBookingProductPickInput,
  ExpertBookingSellableOption,
  ExpertBookingServiceRecord,
  ExpertBookingServiceRecordInput,
  ExpertBookingStatus,
  ExpertCalendarDayOverride,
  ExpertCalendarSnapshot,
  ExpertCalendarWeeklySlot
} from '~/utils/expert-booking-types'

/**
 * Expert-booking Admin／Expert-station API client.
 * Aligned to candor-core PR #155 OpenAPI admin @ 27901b4
 * (docs/spec/34-expert-booking.md + public/api/docs/openapi-admin.yaml).
 *
 * Admin:
 * - GET    /api/v1/admin/expert-bookings
 * - GET    /api/v1/admin/expert-booking/{id}
 * - POST   /api/v1/admin/expert-booking/{id}/cancel  body: { reason? }
 * - PUT    /api/v1/admin/expert-booking/{id}/product-picks  body: { product_picks }
 *
 * Expert station:
 * - GET    /api/v1/admin/expert-station/bookings
 * - GET    /api/v1/admin/expert-station/bookings/{id}
 * - PUT    /api/v1/admin/expert-station/bookings/{id}/pin  body: { pinned }
 * - PUT    /api/v1/admin/expert-station/last-seen  body: { booking_id }
 * - GET    /api/v1/admin/expert-station/bookings/{id}/conversations
 * - PUT    /api/v1/admin/expert-station/bookings/{id}/confirm-time  body: { confirmed_starts_at, confirmed_ends_at? }
 * - PUT    /api/v1/admin/expert-station/bookings/{id}/service-record
 * - POST   /api/v1/admin/expert-station/bookings/{id}/attachments  multipart
 * - POST   /api/v1/admin/expert-station/bookings/{id}/complete
 * - PUT    /api/v1/admin/expert-station/bookings/{id}/product-picks
 *
 * Calendar:
 * - GET    /api/v1/admin/expert-calendar?from&to&expert_operator_id?
 * - PUT    /api/v1/admin/expert-calendar/weekly  body: { expert_operator_id, slots[] }
 * - PUT    /api/v1/admin/expert-calendar/day-override  body: { expert_operator_id, override_date, slots[] }
 * - DELETE /api/v1/admin/expert-calendar/day-override  body: { expert_operator_id, override_date }
 */

/** Opt-in local fixtures. Live admin／expert-station calls core unless `NUXT_PUBLIC_EXPERT_BOOKING_MOCK=1`. */
export function isExpertBookingMockEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().public.expertBookingMock)
  } catch {
    return process.env.NUXT_PUBLIC_EXPERT_BOOKING_MOCK === '1'
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

async function adminFetchMultipart<T>(
  apiBase: string,
  token: string,
  path: string,
  formData: FormData
): Promise<T> {
  try {
    const res = await $fetch<AdminSuccess<T>>(adminUrl(apiBase, path), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })
    return res.data
  } catch (error) {
    throw new AdminApiError(readStatus(error) || 500, readMessage(error) || 'request_failed')
  }
}

function offsetLimit(opts: { limit?: number, offset?: number }) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50))
  const offset = Math.max(0, opts.offset ?? 0)
  return { limit, offset }
}

function sortStationItems(
  items: ExpertBookingListResult['expert_bookings']
) {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1
    }
    const ap = a.paid_at || ''
    const bp = b.paid_at || ''
    return bp.localeCompare(ap)
  })
}

export async function listAdminExpertBookings(
  apiBase: string,
  token: string,
  opts: { status?: ExpertBookingStatus, q?: string, limit?: number, offset?: number } = {}
): Promise<ExpertBookingListResult> {
  if (isExpertBookingMockEnabled()) {
    const { limit, offset } = offsetLimit(opts)
    let rows = store().allDetails().map(d => store().listItem(d, null))
    if (opts.status) {
      rows = rows.filter(r => r.status === opts.status)
    }
    if (opts.q) {
      const q = opts.q.toLowerCase()
      rows = rows.filter(r =>
        r.contact_name.toLowerCase().includes(q)
        || (r.order_no || '').toLowerCase().includes(q)
        || (r.member_email || '').toLowerCase().includes(q)
      )
    }
    return {
      expert_bookings: rows.slice(offset, offset + limit),
      total: rows.length,
      last_seen_booking_id: null
    }
  }
  const q = new URLSearchParams()
  if (opts.status) {
    q.set('status', opts.status)
  }
  if (opts.q) {
    q.set('q', opts.q)
  }
  q.set('limit', String(opts.limit ?? 50))
  q.set('offset', String(opts.offset ?? 0))
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
  id: string,
  reason?: string
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
    row.cancelled_at = new Date().toISOString()
    row.cancel_reason = reason?.trim() || null
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-booking/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: reason?.trim() ? { reason: reason.trim() } : {}
  })
}

export async function putAdminExpertBookingProductPicks(
  apiBase: string,
  token: string,
  id: string,
  productPicks: ExpertBookingProductPickInput[]
): Promise<ExpertBookingProductPick[]> {
  if (isExpertBookingMockEnabled()) {
    if (!store().details.has(id)) {
      throw new AdminApiError(404, 'not_found')
    }
    return structuredClone(store().applyProductPicks(id, productPicks))
  }
  const data = await adminFetch<{ product_picks: ExpertBookingProductPick[] }>(
    apiBase,
    token,
    `/expert-booking/${encodeURIComponent(id)}/product-picks`,
    { method: 'PUT', body: { product_picks: productPicks } }
  )
  return data.product_picks
}

export async function listExpertStationBookings(
  apiBase: string,
  token: string,
  expertId: string,
  opts: { status?: ExpertBookingStatus, limit?: number, offset?: number } = {}
): Promise<ExpertBookingListResult> {
  if (isExpertBookingMockEnabled()) {
    const { limit, offset } = offsetLimit(opts)
    let rows = store().allDetails()
      .filter(d => d.status !== 'cancelled')
      .map(d => store().listItem(d, expertId))
    if (opts.status) {
      rows = rows.filter(r => r.status === opts.status)
    }
    rows = sortStationItems(rows)
    return {
      expert_bookings: rows.slice(offset, offset + limit),
      total: rows.length,
      last_seen_booking_id: store().getLastSeen(expertId)
    }
  }
  const q = new URLSearchParams()
  if (opts.status) {
    q.set('status', opts.status)
  }
  if (opts.limit != null) {
    q.set('limit', String(opts.limit))
  }
  if (opts.offset != null) {
    q.set('offset', String(opts.offset))
  }
  const suffix = q.toString() ? `?${q}` : ''
  return adminFetch(apiBase, token, `/expert-station/bookings${suffix}`)
}

export async function pinExpertStationBooking(
  apiBase: string,
  token: string,
  expertId: string,
  id: string,
  pinned: boolean
): Promise<{ booking_id: string, pinned: boolean }> {
  if (isExpertBookingMockEnabled()) {
    if (!store().details.has(id)) {
      throw new AdminApiError(404, 'not_found')
    }
    store().setPinned(expertId, id, pinned)
    return { booking_id: id, pinned }
  }
  return adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}/pin`, {
    method: 'PUT',
    body: { pinned }
  })
}

export async function putExpertStationLastSeen(
  apiBase: string,
  token: string,
  expertId: string,
  id: string
): Promise<{ booking_id: string }> {
  if (isExpertBookingMockEnabled()) {
    if (!store().details.has(id)) {
      throw new AdminApiError(404, 'not_found')
    }
    store().setLastSeen(expertId, id)
    return { booking_id: id }
  }
  return adminFetch(apiBase, token, '/expert-station/last-seen', {
    method: 'PUT',
    body: { booking_id: id }
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
  const detail = await adminFetch<ExpertBookingDetail>(
    apiBase,
    token,
    `/expert-station/bookings/${encodeURIComponent(id)}`
  )
  try {
    await putExpertStationLastSeen(apiBase, token, expertId, id)
  } catch {
    // non-fatal
  }
  return detail
}

export async function listExpertStationBookingConversations(
  apiBase: string,
  token: string,
  _expertId: string,
  id: string,
  opts: { limit?: number, offset?: number } = {}
): Promise<ExpertBookingConversationsResult> {
  if (isExpertBookingMockEnabled()) {
    if (!store().details.has(id)) {
      throw new AdminApiError(404, 'not_found')
    }
    const conversations = store().conversations(id)
    return { conversations, total: conversations.length }
  }
  const q = new URLSearchParams()
  if (opts.limit != null) {
    q.set('limit', String(opts.limit))
  }
  if (opts.offset != null) {
    q.set('offset', String(opts.offset))
  }
  const suffix = q.toString() ? `?${q}` : ''
  return adminFetch(
    apiBase,
    token,
    `/expert-station/bookings/${encodeURIComponent(id)}/conversations${suffix}`
  )
}

export async function putExpertStationConfirmTime(
  apiBase: string,
  token: string,
  _expertId: string,
  id: string,
  input: { confirmed_starts_at: string, confirmed_ends_at?: string | null }
): Promise<ExpertBookingDetail> {
  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    row.confirmed_starts_at = input.confirmed_starts_at
    row.confirmed_ends_at = input.confirmed_ends_at ?? null
    if (row.status === 'awaiting_schedule') {
      row.status = 'scheduled'
    }
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}/confirm-time`, {
    method: 'PUT',
    body: {
      confirmed_starts_at: input.confirmed_starts_at,
      ...(input.confirmed_ends_at !== undefined
        ? { confirmed_ends_at: input.confirmed_ends_at }
        : {})
    }
  })
}

export async function uploadExpertStationAttachment(
  apiBase: string,
  token: string,
  id: string,
  file: File | Blob,
  filename?: string
): Promise<ExpertBookingAttachment> {
  if (isExpertBookingMockEnabled()) {
    if (!store().details.has(id)) {
      throw new AdminApiError(404, 'not_found')
    }
    const name = filename
      || (file instanceof File ? file.name : 'attachment.bin')
    const type = file.type || 'application/pdf'
    return store().uploadAttachment(id, { name, type, size: file.size })
  }
  const form = new FormData()
  form.append('file', file, filename)
  return adminFetchMultipart(
    apiBase,
    token,
    `/expert-station/bookings/${encodeURIComponent(id)}/attachments`,
    form
  )
}

export async function putExpertStationServiceRecord(
  apiBase: string,
  token: string,
  expertId: string,
  id: string,
  record: ExpertBookingServiceRecordInput
): Promise<ExpertBookingServiceRecord> {
  const salesContent = record.sales_content?.trim() ? record.sales_content.trim() : '無'
  const body: ExpertBookingServiceRecordInput = {
    served_at: record.served_at,
    service_method: record.service_method,
    content: record.content,
    sales_content: salesContent,
    ...(record.duration_minutes !== undefined ? { duration_minutes: record.duration_minutes } : {}),
    ...(record.sales_result !== undefined ? { sales_result: record.sales_result } : {}),
    ...(record.deal_amount !== undefined ? { deal_amount: record.deal_amount } : {}),
    ...(record.follow_up !== undefined ? { follow_up: record.follow_up } : {}),
    ...(record.attachments !== undefined ? { attachments: record.attachments } : {})
  }

  if (isExpertBookingMockEnabled()) {
    const row = store().details.get(id)
    if (!row) {
      throw new AdminApiError(404, 'not_found')
    }
    const now = new Date().toISOString()
    const saved: ExpertBookingServiceRecord = {
      booking_id: id,
      served_at: body.served_at,
      service_method: body.service_method,
      content: body.content,
      sales_content: salesContent,
      duration_minutes: body.duration_minutes ?? null,
      sales_result: body.sales_result ?? null,
      deal_amount: body.deal_amount ?? null,
      follow_up: body.follow_up ?? null,
      attachments: body.attachments ? [...body.attachments] : [],
      filled_by_operator_id: expertId,
      filled_at: now,
      updated_at: now
    }
    row.service_record = saved
    return structuredClone(saved)
  }
  const data = await adminFetch<{ service_record: ExpertBookingServiceRecord }>(
    apiBase,
    token,
    `/expert-station/bookings/${encodeURIComponent(id)}/service-record`,
    { method: 'PUT', body }
  )
  return data.service_record
}

export async function putExpertStationProductPicks(
  apiBase: string,
  token: string,
  id: string,
  productPicks: ExpertBookingProductPickInput[]
): Promise<ExpertBookingProductPick[]> {
  if (isExpertBookingMockEnabled()) {
    if (!store().details.has(id)) {
      throw new AdminApiError(404, 'not_found')
    }
    return structuredClone(store().applyProductPicks(id, productPicks))
  }
  const data = await adminFetch<{ product_picks: ExpertBookingProductPick[] }>(
    apiBase,
    token,
    `/expert-station/bookings/${encodeURIComponent(id)}/product-picks`,
    { method: 'PUT', body: { product_picks: productPicks } }
  )
  return data.product_picks
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
    row.completed_at = new Date().toISOString()
    return structuredClone(row)
  }
  return adminFetch(apiBase, token, `/expert-station/bookings/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: {}
  })
}

export async function getExpertCalendar(
  apiBase: string,
  token: string,
  range: { from: string, to: string, expert_operator_id?: string | null }
): Promise<ExpertCalendarSnapshot> {
  if (isExpertBookingMockEnabled()) {
    return store().calendarSnapshot({
      from: range.from,
      to: range.to,
      expertOperatorId: range.expert_operator_id
    })
  }
  const q = new URLSearchParams()
  q.set('from', range.from)
  q.set('to', range.to)
  if (range.expert_operator_id) {
    q.set('expert_operator_id', range.expert_operator_id)
  }
  return adminFetch(apiBase, token, `/expert-calendar?${q}`)
}

export async function putExpertCalendarWeekly(
  apiBase: string,
  token: string,
  input: {
    expert_operator_id: string
    slots: Array<{ weekday: number, slot_start_minute: number }>
  }
): Promise<ExpertCalendarWeeklySlot[]> {
  if (isExpertBookingMockEnabled()) {
    return structuredClone(
      store().replaceWeeklyForExpert(input.expert_operator_id, input.slots)
    )
  }
  const data = await adminFetch<{ weekly: ExpertCalendarWeeklySlot[] }>(
    apiBase,
    token,
    '/expert-calendar/weekly',
    { method: 'PUT', body: input }
  )
  return data.weekly
}

export async function putExpertCalendarDayOverride(
  apiBase: string,
  token: string,
  input: {
    expert_operator_id: string
    override_date: string
    slots: number[]
  }
): Promise<ExpertCalendarDayOverride> {
  if (isExpertBookingMockEnabled()) {
    return structuredClone(store().putDayOverride(input))
  }
  return adminFetch(apiBase, token, '/expert-calendar/day-override', {
    method: 'PUT',
    body: input
  })
}

export async function deleteExpertCalendarDayOverride(
  apiBase: string,
  token: string,
  input: { expert_operator_id: string, override_date: string }
): Promise<{ cleared: boolean }> {
  if (isExpertBookingMockEnabled()) {
    return store().deleteDayOverride(input.expert_operator_id, input.override_date)
  }
  return adminFetch(apiBase, token, '/expert-calendar/day-override', {
    method: 'DELETE',
    body: input
  })
}

export async function listExpertBookingSellableOptions(
  apiBase: string,
  token: string
): Promise<ExpertBookingSellableOption[]> {
  if (isExpertBookingMockEnabled()) {
    return EXPERT_BOOKING_SELLABLE_OPTIONS.map(o => ({ ...o }))
  }
  const data = await adminFetch<{ sellable_items?: unknown[] }>(
    apiBase,
    token,
    '/supplements'
  )
  const rows = Array.isArray(data.sellable_items) ? data.sellable_items : []
  return rows.flatMap((row) => {
    if (!isRecord(row) || typeof row.id !== 'string') {
      return []
    }
    if (row.sale_status !== 'on_sale') {
      return []
    }
    return [{
      id: row.id,
      name_zh: typeof row.name_zh === 'string' ? row.name_zh : row.id,
      name_en: typeof row.name_en === 'string' ? row.name_en : '',
      sku: typeof row.sku === 'string' ? row.sku : null,
      code: typeof row.code === 'string' ? row.code : null
    }]
  })
}

export function statusBadgeColor(status: ExpertBookingStatus): 'warning' | 'info' | 'success' | 'neutral' {
  switch (status) {
    case 'awaiting_schedule':
      return 'warning'
    case 'scheduled':
      return 'info'
    case 'completed':
      return 'success'
    default:
      return 'neutral'
  }
}

export function isAllowedAttachmentContentType(
  value: string
): value is ExpertBookingAttachmentContentType {
  return value === 'application/pdf'
    || value === 'image/jpeg'
    || value === 'image/png'
    || value === 'image/webp'
}
