import type { AdminFailure, AdminSuccess, OperatorLoginData } from '~/types/operator'

export class AdminApiError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
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
