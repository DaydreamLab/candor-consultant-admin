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

export type AdminClientConfigLink = {
  key: string
  url: string
}

export type AdminClientConfig = {
  items: AdminClientConfigLink[]
  updated_at?: string | null
}

export async function adminGetClientConfig(apiBase: string, token: string): Promise<AdminClientConfig> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/client-config'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return {
      items: parseClientConfigItems(body.data.items),
      updated_at: typeof body.data.updated_at === 'string' ? body.data.updated_at : null
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export type AdminConversationCopy = {
  code: string
  category: string
  text_zh: string
  text_en: string
  updated_at?: string | null
}

export async function adminListConversationCopies(
  apiBase: string,
  token: string
): Promise<AdminConversationCopy[]> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/conversation-copies'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data) || !Array.isArray(body.data.items)) {
      throw new AdminApiError(500, '')
    }
    return body.data.items.filter(isRecord).map(row => ({
      code: typeof row.code === 'string' ? row.code : '',
      category: typeof row.category === 'string' ? row.category : '',
      text_zh: typeof row.text_zh === 'string' ? row.text_zh : '',
      text_en: typeof row.text_en === 'string' ? row.text_en : '',
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null
    })).filter(row => row.code !== '')
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminPatchConversationCopy(
  apiBase: string,
  token: string,
  code: string,
  payload: { text_zh?: string, text_en?: string }
): Promise<AdminConversationCopy> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/conversation-copy/${encodeURIComponent(code)}`),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return {
      code: typeof body.data.code === 'string' ? body.data.code : code,
      category: typeof body.data.category === 'string' ? body.data.category : '',
      text_zh: typeof body.data.text_zh === 'string' ? body.data.text_zh : '',
      text_en: typeof body.data.text_en === 'string' ? body.data.text_en : '',
      updated_at: typeof body.data.updated_at === 'string' ? body.data.updated_at : null
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export type AdminClaimGuardTerm = {
  id: string
  term: string
  severity: 'blocked' | 'rewritten'
  pattern: string | null
  replacement: string | null
  active: boolean
  note: string | null
}

export async function adminListClaimGuardTerms(
  apiBase: string,
  token: string
): Promise<AdminClaimGuardTerm[]> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/claim-guard-terms'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data) || !Array.isArray(body.data.items)) {
      throw new AdminApiError(500, '')
    }
    return body.data.items.filter(isRecord).map(parseClaimGuardTerm).filter((row): row is AdminClaimGuardTerm => row !== null)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminCreateClaimGuardTerm(
  apiBase: string,
  token: string,
  payload: {
    term: string
    severity: 'blocked' | 'rewritten'
    pattern?: string | null
    replacement?: string | null
    active?: boolean
    note?: string | null
  }
): Promise<AdminClaimGuardTerm> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/claim-guard-terms'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parseClaimGuardTerm(body.data)
    if (!parsed) {
      throw new AdminApiError(500, '')
    }
    return parsed
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminPatchClaimGuardTerm(
  apiBase: string,
  token: string,
  id: string,
  payload: {
    term?: string
    severity?: 'blocked' | 'rewritten'
    pattern?: string | null
    replacement?: string | null
    active?: boolean
    note?: string | null
  }
): Promise<AdminClaimGuardTerm> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/claim-guard-term/${encodeURIComponent(id)}`),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parseClaimGuardTerm(body.data)
    if (!parsed) {
      throw new AdminApiError(500, '')
    }
    return parsed
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

function parseClaimGuardTerm(row: Record<string, unknown>): AdminClaimGuardTerm | null {
  if (typeof row.id !== 'string' || typeof row.term !== 'string') {
    return null
  }
  const severity = row.severity === 'blocked' || row.severity === 'rewritten' ? row.severity : null
  if (!severity) {
    return null
  }
  return {
    id: row.id,
    term: row.term,
    severity,
    pattern: typeof row.pattern === 'string' ? row.pattern : null,
    replacement: typeof row.replacement === 'string' ? row.replacement : null,
    active: Boolean(row.active),
    note: typeof row.note === 'string' ? row.note : null
  }
}

export async function adminPatchClientConfig(
  apiBase: string,
  token: string,
  payload: { items: AdminClientConfigLink[] }
): Promise<AdminClientConfig> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/client-config'), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return {
      items: parseClientConfigItems(body.data.items),
      updated_at: typeof body.data.updated_at === 'string' ? body.data.updated_at : null
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

function parseClientConfigItems(raw: unknown): AdminClientConfigLink[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(isRecord).map(row => ({
    key: typeof row.key === 'string' ? row.key : '',
    url: typeof row.url === 'string' ? row.url : ''
  })).filter(row => row.key !== '')
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
    return readOrderMessagesPayload(body.data)
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
    return readOrderMessagesPayload(body.data)
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

export type PackagePlanWrite = {
  name_zh: string
  name_en: string | null
  description: string | null
  price: number
  period_days: number
  pack_capacity: number
  core_count: number
  sort_order: number
  active: boolean
}

export async function adminGetPackagePlan(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/package-plan/${encodeURIComponent(id)}`), {
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

export async function adminUpdatePackagePlan(
  apiBase: string,
  token: string,
  id: string,
  payload: PackagePlanWrite
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/package-plan/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
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
}

export async function adminCreateSellableItem(apiBase: string, token: string, payload: SellableItemWrite) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/sellable-items'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload.body
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
      body: payload.body
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

function readOrderMessagesPayload(data: unknown): {
  messages: Record<string, unknown>[]
  llm_usage: Record<string, unknown> | null
} {
  if (Array.isArray(data)) {
    return {
      messages: data.filter(isRecord),
      llm_usage: null
    }
  }
  if (isRecord(data) && Array.isArray(data.messages)) {
    return {
      messages: data.messages.filter(isRecord),
      llm_usage: isRecord(data.llm_usage) ? data.llm_usage : null
    }
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
