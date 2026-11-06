import type { AdminFailure, AdminSuccess } from '~/types/operator'
import { AdminApiError } from '~/utils/admin-api'
import {
  mockGetExpertBookingProduct,
  mockPutExpertBookingProduct
} from '~/utils/expert-booking-product-fixtures'
import type {
  ExpertBookingProduct,
  ExpertBookingProductField,
  ExpertBookingProductFieldErrors,
  ExpertBookingProductWrite
} from '~/utils/expert-booking-product-types'

/**
 * Admin API（合約 2026-11-06）：
 * - GET /api/v1/admin/expert-booking-product
 * - PUT /api/v1/admin/expert-booking-product
 *
 * 回應包 { status:"success", data:{ expert_booking_product: {...} } }
 * 不做新增／刪除；code 不可改。
 */

const PRODUCT_FIELDS: ExpertBookingProductField[] = [
  'name_zh',
  'name_en',
  'description',
  'price',
  'active'
]

/** Default ON locally; set `NUXT_PUBLIC_EXPERT_BOOKING_PRODUCT_MOCK=0` for live core. */
export function isExpertBookingProductMockEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().public.expertBookingProductMock)
  } catch {
    return process.env.NUXT_PUBLIC_EXPERT_BOOKING_PRODUCT_MOCK !== '0'
  }
}

export class ExpertBookingProductApiError extends AdminApiError {
  fields: ExpertBookingProductFieldErrors

  constructor(
    statusCode: number,
    message: string,
    code = '',
    fields: ExpertBookingProductFieldErrors = {}
  ) {
    super(statusCode, message, code)
    this.fields = fields
  }
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

function readFailure(error: unknown): AdminFailure | null {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null
  }
  const data = (error as { data?: AdminFailure }).data
  if (!data || data.status !== 'failed') {
    return null
  }
  return data
}

function readMessage(error: unknown) {
  return readFailure(error)?.error_message?.trim() || ''
}

function readErrorCode(error: unknown) {
  const failure = readFailure(error)
  if (!failure) {
    return ''
  }
  if (typeof failure.error_code === 'string' && failure.error_code.trim()) {
    return failure.error_code.trim()
  }
  if (typeof failure.error_code === 'number' && Number.isFinite(failure.error_code)) {
    return String(failure.error_code)
  }
  return ''
}

function fieldMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim()
      }
    }
  }
  return null
}

/** Parse 422 field errors from core `error_data`（fields map 或頂層欄位鍵）。 */
export function parseExpertBookingProductFieldErrors(
  errorData: Record<string, unknown> | null | undefined
): ExpertBookingProductFieldErrors {
  if (!errorData) {
    return {}
  }
  const source = isRecord(errorData.fields) ? errorData.fields : errorData
  const out: ExpertBookingProductFieldErrors = {}
  for (const field of PRODUCT_FIELDS) {
    const message = fieldMessage(source[field])
    if (message) {
      out[field] = message
    }
  }
  return out
}

function toApiError(error: unknown): ExpertBookingProductApiError {
  if (error instanceof ExpertBookingProductApiError) {
    return error
  }
  if (error instanceof AdminApiError) {
    return new ExpertBookingProductApiError(error.statusCode, error.message, error.code)
  }
  const failure = readFailure(error)
  const fields = parseExpertBookingProductFieldErrors(failure?.error_data ?? null)
  return new ExpertBookingProductApiError(
    readStatus(error),
    readMessage(error),
    readErrorCode(error),
    fields
  )
}

function adminUrl(apiBase: string, path: string) {
  const base = apiBase.replace(/\/$/, '')
  return `${base}/admin${path.startsWith('/') ? path : `/${path}`}`
}

function parseProduct(row: Record<string, unknown>): ExpertBookingProduct | null {
  if (typeof row.code !== 'string' || !row.code.trim()) {
    return null
  }
  if (typeof row.name_zh !== 'string') {
    return null
  }
  const price = typeof row.price === 'number' && Number.isInteger(row.price)
    ? row.price
    : null
  if (price === null || typeof row.active !== 'boolean') {
    return null
  }
  return {
    code: row.code,
    name_zh: row.name_zh,
    name_en: typeof row.name_en === 'string'
      ? row.name_en
      : row.name_en === null
        ? null
        : null,
    description: typeof row.description === 'string'
      ? row.description
      : row.description === null
        ? null
        : null,
    price,
    active: row.active,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null
  }
}

function parseEnvelope(data: unknown): ExpertBookingProduct | null {
  if (!isRecord(data)) {
    return null
  }
  const nested = data.expert_booking_product
  if (!isRecord(nested)) {
    return null
  }
  return parseProduct(nested)
}

/** GET /admin/expert-booking-product */
export async function adminGetExpertBookingProduct(
  apiBase: string,
  token: string
): Promise<ExpertBookingProduct> {
  if (isExpertBookingProductMockEnabled()) {
    void apiBase
    void token
    return mockGetExpertBookingProduct()
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, '/expert-booking-product'),
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (body?.status !== 'success') {
      throw new ExpertBookingProductApiError(500, '')
    }
    const parsed = parseEnvelope(body.data)
    if (!parsed) {
      throw new ExpertBookingProductApiError(500, '')
    }
    return parsed
  } catch (error) {
    throw toApiError(error)
  }
}

/** PUT /admin/expert-booking-product — admin only；不做 create／delete；不送 code */
export async function adminPutExpertBookingProduct(
  apiBase: string,
  token: string,
  body: ExpertBookingProductWrite
): Promise<ExpertBookingProduct> {
  if (isExpertBookingProductMockEnabled()) {
    void apiBase
    void token
    if (!body.name_zh.trim()) {
      throw new ExpertBookingProductApiError(
        422,
        'Validation failed',
        'validation_error',
        { name_zh: 'name_zh is required' }
      )
    }
    if (!Number.isInteger(body.price) || body.price <= 0) {
      throw new ExpertBookingProductApiError(
        422,
        'Validation failed',
        'validation_error',
        { price: 'price must be an integer greater than 0' }
      )
    }
    return mockPutExpertBookingProduct(body)
  }
  try {
    const response = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, '/expert-booking-product'),
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body
      }
    )
    if (response?.status !== 'success') {
      throw new ExpertBookingProductApiError(500, '')
    }
    const parsed = parseEnvelope(response.data)
    if (!parsed) {
      throw new ExpertBookingProductApiError(500, '')
    }
    return parsed
  } catch (error) {
    throw toApiError(error)
  }
}
