import type { AdminFailure, AdminSuccess } from '~/types/operator'
import { AdminApiError } from '~/utils/admin-api'

export type PrivacyPolicy = {
  title: string
  body: string
  version: number
  updated_at: string | null
  updated_by: string | null
}

export type PrivacyPolicyVersionSummary = {
  version: number
  title: string
  updated_at: string | null
  updated_by: string | null
  preview: string
}

export type PrivacyPolicyVersionDetail = {
  version: number
  title: string
  body: string
  updated_at: string | null
  updated_by: string | null
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

function apiUrl(apiBase: string, path: string) {
  const base = apiBase.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function parseVersion(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number.parseInt(value.trim(), 10)
    return n >= 1 ? n : null
  }
  return null
}

function parsePrivacyPolicy(data: Record<string, unknown>): PrivacyPolicy | null {
  const version = parseVersion(data.version)
  if (version === null || typeof data.title !== 'string' || typeof data.body !== 'string') {
    return null
  }
  return {
    title: data.title,
    body: data.body,
    version,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    updated_by: typeof data.updated_by === 'string' ? data.updated_by : null
  }
}

function parseVersionSummary(row: Record<string, unknown>): PrivacyPolicyVersionSummary | null {
  const version = parseVersion(row.version)
  if (version === null || typeof row.title !== 'string') {
    return null
  }
  return {
    version,
    title: row.title,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
    updated_by: typeof row.updated_by === 'string' ? row.updated_by : null,
    preview: typeof row.preview === 'string' ? row.preview : ''
  }
}

function parseVersionDetail(data: Record<string, unknown>): PrivacyPolicyVersionDetail | null {
  const version = parseVersion(data.version)
  if (version === null || typeof data.title !== 'string' || typeof data.body !== 'string') {
    return null
  }
  return {
    version,
    title: data.title,
    body: data.body,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    updated_by: typeof data.updated_by === 'string' ? data.updated_by : null
  }
}

/** GET /api/v1/legal/privacy-policy — public */
export async function getPublicPrivacyPolicy(apiBase: string): Promise<PrivacyPolicy> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(apiUrl(apiBase, '/legal/privacy-policy'))
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parsePrivacyPolicy(body.data)
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

/** GET /api/v1/admin/legal/privacy-policy — operator JWT */
export async function adminGetPrivacyPolicy(apiBase: string, token: string): Promise<PrivacyPolicy> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(apiUrl(apiBase, '/admin/legal/privacy-policy'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parsePrivacyPolicy(body.data)
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

/** PATCH /api/v1/admin/legal/privacy-policy — ops/admin only */
export async function adminPatchPrivacyPolicy(
  apiBase: string,
  token: string,
  payload: { title?: string, body?: string }
): Promise<PrivacyPolicy> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(apiUrl(apiBase, '/admin/legal/privacy-policy'), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parsePrivacyPolicy(body.data)
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

/** GET /api/v1/admin/legal/privacy-policy/versions — newest-first */
export async function adminListPrivacyPolicyVersions(
  apiBase: string,
  token: string
): Promise<PrivacyPolicyVersionSummary[]> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      apiUrl(apiBase, '/admin/legal/privacy-policy/versions'),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data) || !Array.isArray(body.data.items)) {
      throw new AdminApiError(500, '')
    }
    return body.data.items
      .filter(isRecord)
      .map(parseVersionSummary)
      .filter((row): row is PrivacyPolicyVersionSummary => row !== null)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

/** GET /api/v1/admin/legal/privacy-policy/versions/{version} */
export async function adminGetPrivacyPolicyVersion(
  apiBase: string,
  token: string,
  version: number
): Promise<PrivacyPolicyVersionDetail> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      apiUrl(apiBase, `/admin/legal/privacy-policy/versions/${encodeURIComponent(String(version))}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parseVersionDetail(body.data)
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
