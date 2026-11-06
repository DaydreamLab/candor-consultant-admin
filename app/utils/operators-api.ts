import type {
  AdminFailure,
  AdminOperator,
  AdminOperatorCreate,
  AdminOperatorPasswordReset,
  AdminOperatorPatch,
  AdminSuccess,
  OperatorRole,
  OperatorStatus
} from '~/types/operator'
import { AdminApiError } from '~/utils/admin-api'
import { sortOperatorRoles } from '~/utils/operator-role-order'

const ROLE_SET = new Set<OperatorRole>(['expert', 'ops', 'admin'])

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

function wrap(error: unknown): never {
  if (error instanceof AdminApiError) {
    throw error
  }
  throw new AdminApiError(readStatus(error), readMessage(error), readErrorCode(error))
}

function parseRoles(value: unknown): OperatorRole[] {
  if (!Array.isArray(value)) {
    return []
  }
  const unique: OperatorRole[] = []
  for (const role of value) {
    if (typeof role === 'string' && ROLE_SET.has(role as OperatorRole) && !unique.includes(role as OperatorRole)) {
      unique.push(role as OperatorRole)
    }
  }
  return sortOperatorRoles(unique)
}

function parseStatus(value: unknown): OperatorStatus | null {
  return value === 'active' || value === 'suspended' ? value : null
}

function parseOperator(row: unknown): AdminOperator | null {
  if (!isRecord(row)) {
    return null
  }
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  const email = typeof row.email === 'string' ? row.email.trim() : ''
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  const roles = parseRoles(row.roles)
  const status = parseStatus(row.status)
  if (!id || !email || !name || roles.length === 0 || !status) {
    return null
  }
  return {
    id,
    email,
    name,
    roles,
    status,
    last_login_at: typeof row.last_login_at === 'string' ? row.last_login_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : ''
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

/** GET /api/v1/admin/operators → data.operators[]（全量、無分頁） */
export async function adminListOperators(apiBase: string, token: string): Promise<AdminOperator[]> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/operators'), {
      headers: authHeaders(token)
    })
    if (body?.status !== 'success' || !isRecord(body.data) || !Array.isArray(body.data.operators)) {
      throw new AdminApiError(500, '')
    }
    return body.data.operators.map(parseOperator).filter((row): row is AdminOperator => row != null)
  } catch (error) {
    wrap(error)
  }
}

/** GET /api/v1/admin/operators/{id} → data＝單一 operator */
export async function adminGetOperator(apiBase: string, token: string, id: string): Promise<AdminOperator> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/operators/${encodeURIComponent(id)}`),
      { headers: authHeaders(token) }
    )
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    const row = parseOperator(body.data)
    if (!row) {
      throw new AdminApiError(500, '')
    }
    return row
  } catch (error) {
    wrap(error)
  }
}

/** POST /api/v1/admin/operators → 201 operator */
export async function adminCreateOperator(
  apiBase: string,
  token: string,
  payload: AdminOperatorCreate
): Promise<AdminOperator> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/operators'), {
      method: 'POST',
      headers: authHeaders(token),
      body: {
        email: payload.email,
        name: payload.name,
        roles: sortOperatorRoles(payload.roles),
        password: payload.password
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    const row = parseOperator(body.data)
    if (!row) {
      throw new AdminApiError(500, '')
    }
    return row
  } catch (error) {
    wrap(error)
  }
}

/** PATCH /api/v1/admin/operators/{id} */
export async function adminPatchOperator(
  apiBase: string,
  token: string,
  id: string,
  payload: AdminOperatorPatch
): Promise<AdminOperator> {
  try {
    const body: Record<string, unknown> = {}
    if (typeof payload.name === 'string') {
      body.name = payload.name
    }
    if (Array.isArray(payload.roles)) {
      body.roles = sortOperatorRoles(payload.roles)
    }
    if (payload.status === 'active' || payload.status === 'suspended') {
      body.status = payload.status
    }
    const response = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/operators/${encodeURIComponent(id)}`),
      {
        method: 'PATCH',
        headers: authHeaders(token),
        body
      }
    )
    if (response?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    const row = parseOperator(response.data)
    if (!row) {
      throw new AdminApiError(500, '')
    }
    return row
  } catch (error) {
    wrap(error)
  }
}

/** POST /api/v1/admin/operators/{id}/password → {id, status:'password_reset'} */
export async function adminResetOperatorPassword(
  apiBase: string,
  token: string,
  id: string,
  password: string
): Promise<AdminOperatorPasswordReset> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/operators/${encodeURIComponent(id)}/password`),
      {
        method: 'POST',
        headers: authHeaders(token),
        body: { password }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const resetId = typeof body.data.id === 'string' ? body.data.id : id
    if (body.data.status !== 'password_reset') {
      throw new AdminApiError(500, '')
    }
    return { id: resetId, status: 'password_reset' }
  } catch (error) {
    wrap(error)
  }
}
