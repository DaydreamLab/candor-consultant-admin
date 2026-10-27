import type { AdminFailure, AdminSuccess } from '~/types/operator'
import { AdminApiError } from '~/utils/admin-api'
import {
  mockGetCtaCatalogItem,
  mockGetCtaScenarioMatrix,
  mockListCtaCatalog,
  mockPatchCtaCatalogItem,
  mockPatchCtaScenarioMatrix
} from '~/utils/cta-catalog-fixtures'
import type {
  CtaCatalogItem,
  CtaCatalogPatch,
  CtaCatalogType,
  CtaDecisionFormat,
  CtaScenarioId,
  CtaScenarioMatrix,
  CtaScenarioMatrixRow
} from '~/utils/cta-catalog-types'
import {
  isCtaCatalogType,
  isCtaDecisionFormat,
  isCtaScenarioId,
  isHardGateForbidden
} from '~/utils/cta-catalog-types'

/**
 * Assumed Admin API shape (pending candor-core CTA catalog PR).
 * Paths are centralized here so core merge only needs client path tweaks.
 *
 * - GET    /api/v1/admin/cta-catalog
 * - GET    /api/v1/admin/cta-catalog/{type}
 * - PATCH  /api/v1/admin/cta-catalog/{type}
 * - GET    /api/v1/admin/cta-catalog/situation-matrix
 * - PATCH  /api/v1/admin/cta-catalog/situation-matrix
 *
 * Paths aligned with candor-core #98. No create／delete endpoints (product rule).
 */

/** Default ON until core API is live; set `NUXT_PUBLIC_CTA_CATALOG_MOCK=0` to hit real HTTP. */
export function isCtaCatalogMockEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().public.ctaCatalogMock)
  } catch {
    return process.env.NUXT_PUBLIC_CTA_CATALOG_MOCK !== '0'
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

function parseScenarioIds(value: unknown): CtaScenarioId[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isCtaScenarioId)
}

function parseCatalogItem(row: Record<string, unknown>): CtaCatalogItem | null {
  if (!isCtaCatalogType(row.type)) {
    return null
  }
  const decisionFormat: CtaDecisionFormat = isCtaDecisionFormat(row.decision_format)
    ? row.decision_format
    : 'noul'
  const replyAction = isCtaCatalogType(row.reply_action_type) ? row.reply_action_type : row.type
  return {
    type: row.type,
    display_name: typeof row.display_name === 'string' ? row.display_name : row.type,
    decision_question: typeof row.decision_question === 'string' ? row.decision_question : '',
    decision_format: decisionFormat,
    format_detail: typeof row.format_detail === 'string'
      ? row.format_detail
      : row.format_detail === null
        ? null
        : null,
    reply_action_type: replyAction,
    reply_action_hint: typeof row.reply_action_hint === 'string' ? row.reply_action_hint : '',
    scenario_ids: parseScenarioIds(row.scenario_ids),
    is_sample: row.is_sample === true,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null
  }
}

function parseMatrixRow(row: Record<string, unknown>): CtaScenarioMatrixRow | null {
  const scenario = row.scenario
  if (!isCtaScenarioId(scenario) || !Array.isArray(row.types)) {
    return null
  }
  const types = row.types.filter(isCtaCatalogType).filter(type => !isHardGateForbidden(scenario, type))
  const notes: CtaScenarioMatrixRow['notes'] = {}
  if (isRecord(row.notes)) {
    for (const [key, value] of Object.entries(row.notes)) {
      if (isCtaCatalogType(key) && typeof value === 'string') {
        notes[key] = value
      }
    }
  }
  return {
    scenario,
    types,
    notes: Object.keys(notes).length ? notes : undefined
  }
}

function parseMatrix(data: Record<string, unknown>): CtaScenarioMatrix | null {
  if (!Array.isArray(data.rows)) {
    return null
  }
  const rows = data.rows.filter(isRecord).map(parseMatrixRow).filter((row): row is CtaScenarioMatrixRow => row !== null)
  return {
    rows,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null
  }
}

/** GET /admin/cta-catalog */
export async function adminListCtaCatalog(apiBase: string, token: string): Promise<CtaCatalogItem[]> {
  if (isCtaCatalogMockEnabled()) {
    void apiBase
    void token
    return mockListCtaCatalog()
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/cta-catalog'), {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (body?.status !== 'success' || !isRecord(body.data) || !Array.isArray(body.data.items)) {
      throw new AdminApiError(500, '')
    }
    return body.data.items
      .filter(isRecord)
      .map(parseCatalogItem)
      .filter((row): row is CtaCatalogItem => row !== null)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

/** GET /admin/cta-catalog/{type} */
export async function adminGetCtaCatalogItem(
  apiBase: string,
  token: string,
  type: CtaCatalogType
): Promise<CtaCatalogItem> {
  if (isCtaCatalogMockEnabled()) {
    void apiBase
    void token
    const row = mockGetCtaCatalogItem(type)
    if (!row) {
      throw new AdminApiError(404, 'CTA not found')
    }
    return row
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/cta-catalog/${encodeURIComponent(type)}`),
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parseCatalogItem(body.data)
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

/** PATCH /admin/cta-catalog/{type} — admin write; no create／delete */
export async function adminPatchCtaCatalogItem(
  apiBase: string,
  token: string,
  type: CtaCatalogType,
  patch: CtaCatalogPatch
): Promise<CtaCatalogItem> {
  if (isCtaCatalogMockEnabled()) {
    void apiBase
    void token
    const row = mockPatchCtaCatalogItem(type, patch)
    if (!row) {
      throw new AdminApiError(404, 'CTA not found')
    }
    return row
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/cta-catalog/${encodeURIComponent(type)}`),
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: patch
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parseCatalogItem(body.data)
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

/** GET /admin/cta-catalog/situation-matrix */
export async function adminGetCtaScenarioMatrix(
  apiBase: string,
  token: string
): Promise<CtaScenarioMatrix> {
  if (isCtaCatalogMockEnabled()) {
    void apiBase
    void token
    return mockGetCtaScenarioMatrix()
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, '/cta-catalog/situation-matrix'),
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parseMatrix(body.data)
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

/** PATCH /admin/cta-catalog/situation-matrix — admin write; hard gates enforced client-side too */
export async function adminPatchCtaScenarioMatrix(
  apiBase: string,
  token: string,
  matrix: CtaScenarioMatrix
): Promise<CtaScenarioMatrix> {
  const sanitized: CtaScenarioMatrix = {
    ...matrix,
    rows: matrix.rows.map(row => ({
      ...row,
      types: row.types.filter(type => !isHardGateForbidden(row.scenario, type))
    }))
  }
  if (isCtaCatalogMockEnabled()) {
    void apiBase
    void token
    return mockPatchCtaScenarioMatrix(sanitized)
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, '/cta-catalog/situation-matrix'),
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: sanitized
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const parsed = parseMatrix(body.data)
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
