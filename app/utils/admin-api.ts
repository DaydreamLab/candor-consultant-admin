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

export async function adminListOrders(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/orders'), {
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

export async function adminLogin(apiBase: string, email: string, password: string) {
  try {
    const body = await $fetch<AdminSuccess<OperatorLoginData>>(adminUrl(apiBase, '/auth/login'), {
      method: 'POST',
      body: { email, password }
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
