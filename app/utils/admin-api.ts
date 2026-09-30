import type { AdminFailure, AdminSuccess, OperatorLoginData } from '~/types/operator'

export class AdminApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function adminGetMe(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<Record<string, unknown>>>(adminUrl(apiBase, '/me'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

export type AdminOrderListQuery = {
  status?: string
  payment_status?: string
  q?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export async function adminListOrders(apiBase: string, token: string, query: AdminOrderListQuery = {}) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/orders'), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: compactQuery(query)
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readOrderRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetOrder(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/order/${encodeURIComponent(id)}`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

export async function adminListOrderMessages(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/order/${encodeURIComponent(id)}/message`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readOrderMessages(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetOrderHealthReport(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/order/${encodeURIComponent(id)}/health-report`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

export type AdminUserListQuery = {
  q?: string
  has_orders?: boolean
}

export async function adminListUsers(apiBase: string, token: string, query: AdminUserListQuery = {}) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/users'), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: compactUserQuery(query)
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readUserRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetUser(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/users/${encodeURIComponent(id)}`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

export async function adminListUserOrders(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/users/${encodeURIComponent(id)}/orders`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readOrderRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminListUserConversations(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/users/${encodeURIComponent(id)}/conversations`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readConversationRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminListUserConversationMessages(
  apiBase: string,
  token: string,
  userId: string,
  conversationId: string
) {
  try {
    const path = `/users/${encodeURIComponent(userId)}/conversation/${encodeURIComponent(conversationId)}/messages`
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, path), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readOrderMessages(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminListUserHealthReports(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/users/${encodeURIComponent(id)}/health-reports`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readHealthReportRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetUserHealthReport(
  apiBase: string,
  token: string,
  userId: string,
  reportId: string
) {
  try {
    const path = `/users/${encodeURIComponent(userId)}/health-report/${encodeURIComponent(reportId)}`
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, path), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

export async function adminListPackagePlans(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/package-plans'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readPackagePlanRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminListSellableItems(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/sellable-items'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readSellableItemRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export type SellableItemWrite = {
  body: Record<string, unknown>
  image: File | null
}

export async function adminCreateSellableItem(apiBase: string, token: string, payload: SellableItemWrite) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/sellable-items'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: sellableItemRequestBody(payload)
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

export async function adminGetSellableItem(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/sellable-item/${encodeURIComponent(id)}`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

export async function adminUpdateSellableItem(apiBase: string, token: string, id: string, payload: SellableItemWrite) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/sellable-item/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: sellableItemRequestBody(payload)
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
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

function sellableItemRequestBody(payload: SellableItemWrite) {
  if (!payload.image) {
    return payload.body
  }
  const form = new FormData()
  form.append('image', payload.image)
  for (const [key, value] of Object.entries(payload.body)) {
    appendSellableField(form, key, value)
  }
  return form
}

function appendSellableField(form: FormData, key: string, value: unknown) {
  if (value == null) {
    return
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    form.append(key, String(value))
    return
  }
  form.append(key, JSON.stringify(value))
}

export async function adminDeleteSellableItem(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/sellable-item/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminLogin(
  apiBase: string,
  email: string,
  password: string,
  rememberMe: boolean = false
) {
  try {
    const body = await $fetch<AdminSuccess<OperatorLoginData>>(adminUrl(apiBase, '/auth/login'), {
      method: 'POST',
      body: {
        email,
        password,
        remember_me: rememberMe
      }
    })
    if (body?.status !== 'success' || !body.data?.token || !body.data.operator) {
      throw new AdminApiError(500, '')
    }
    return body.data
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    const statusCode = readStatus(error)
    const message = readMessage(error)
    throw new AdminApiError(statusCode, message)
  }
}

function readOrderRows(data: unknown) {
  const rows = orderListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord)
}

function readUserRows(data: unknown) {
  const rows = userListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord)
}

function userListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.users)) {
    return data.users
  }
  return null
}

function readConversationRows(data: unknown) {
  const rows = conversationListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord)
}

function conversationListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.conversations)) {
    return data.conversations
  }
  return null
}

function readHealthReportRows(data: unknown) {
  const rows = healthReportListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord)
}

function healthReportListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.reports)) {
    return data.reports
  }
  return null
}

function orderListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.orders)) {
    return data.orders
  }
  if (Array.isArray(data.items)) {
    return data.items
  }
  const nested = Object.values(data).find((value): value is unknown[] => Array.isArray(value))
  return nested ?? null
}

function readPackagePlanRows(data: unknown) {
  const rows = packagePlanListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord)
}

function packagePlanListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.package_plans)) {
    return data.package_plans
  }
  if (Array.isArray(data.items)) {
    return data.items
  }
  return null
}

function readSellableItemRows(data: unknown) {
  const rows = sellableItemListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord)
}

function sellableItemListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.sellable_items)) {
    return data.sellable_items
  }
  if (Array.isArray(data.items)) {
    return data.items
  }
  return null
}

function readOrderMessages(data: unknown) {
  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }
  if (isRecord(data) && Array.isArray(data.messages)) {
    return data.messages.filter(isRecord)
  }
  throw new AdminApiError(500, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function adminUrl(apiBase: string, path: string) {
  const base = apiBase.replace(/\/$/, '')
  return `${base}/admin${path}`
}

function compactQuery(query: AdminOrderListQuery) {
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      params[key] = value
      continue
    }
    if (typeof value === 'string' && value.trim()) {
      params[key] = value.trim()
    }
  }
  return params
}

function compactUserQuery(query: AdminUserListQuery) {
  const params: Record<string, string | boolean> = {}
  if (typeof query.q === 'string' && query.q.trim()) {
    params.q = query.q.trim()
  }
  if (typeof query.has_orders === 'boolean') {
    params.has_orders = query.has_orders
  }
  return params
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
