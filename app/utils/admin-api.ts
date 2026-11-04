import type {
  KnowledgeChunk,
  KnowledgeAuditEvent,
  KnowledgeAuditListQuery,
  KnowledgeChunkListQuery,
  KnowledgeDataset,
  KnowledgeDatasetGroup,
  KnowledgeDatasetGroupCreate,
  KnowledgeDatasetListQuery,
  KnowledgeDatasetPatch,
  KnowledgeRetrievalPreviewRequest,
  KnowledgeRetrievalPreviewResult
} from '~/types/knowledge'
import type { AdminFailure, AdminSuccess, OperatorLoginData } from '~/types/operator'
import {
  knowledgeAuditRawObject,
  readAuditTotalCount,
  readKnowledgeAuditEvents
} from '~/utils/knowledge-audit-parse'
import {
  parseKnowledgeDatasetStatus,
  parseKnowledgeReviewStatus
} from '~/utils/knowledge-field-parse'
import { parseKnowledgeGapPayload, parseRetrievalHits } from '~/utils/knowledge-retrieval-parse'

export class AdminApiError extends Error {
  statusCode: number
  /** Core `error_code` when present (assumed until OpenAPI lands). */
  code: string

  constructor(statusCode: number, message: string, code = '') {
    super(message)
    this.statusCode = statusCode
    this.code = code
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

export type AdminExpertCaseReviewListQuery = {
  status?: string
  /** `expert_plan`＝付費專家方案案；`legacy`＝舊免費案。省略＝全部。 */
  source?: 'expert_plan' | 'legacy'
  /**
   * OpenAPI（core #143 `b7c5ed0`）列表 query 僅 status／source／limit／offset。
   * 排序由後端：`awaiting_review`＋`expert_plan` → `paid_at` ASC；其餘 `created_at` DESC。
   * 勿再送 sort／order（舊版上傳檔假設，已廢）。
   */
  limit?: number
  offset?: number
}

/** core #143／OpenAPI：同時定稿 → 409 `expert_case_already_finalized`（B-11／C23）. */
export const EXPERT_CASE_ALREADY_FINALIZED_CODE = 'expert_case_already_finalized'

export function isExpertCaseAlreadyFinalizedError(error: unknown): boolean {
  if (!(error instanceof AdminApiError)) {
    return false
  }
  if (error.code === EXPERT_CASE_ALREADY_FINALIZED_CODE) {
    return true
  }
  // Submit 回 409 且無／舊碼時仍顯示 B-11（對齊輪前過渡）.
  if (error.statusCode === 409) {
    return !error.code || error.code === 'expert_case_already_reviewed'
  }
  return false
}

/**
 * expert PATCH `name_zh`／`name_en`／`price` → 403 `expert_plan_field_forbidden`
 *（core #143 `b7c5ed0`／spec 33）。expert 可改 `active`＋`sort_order`；ops／admin 不變。
 */
export const EXPERT_PLAN_FIELD_FORBIDDEN_CODE = 'expert_plan_field_forbidden'

export function isExpertPlanFieldForbiddenError(error: unknown): boolean {
  return error instanceof AdminApiError && error.code === EXPERT_PLAN_FIELD_FORBIDDEN_CODE
}

/** POST /admin/order/{id}/shipment 遇退款申請中 → 409 `refund_request_pending`. */
export const REFUND_REQUEST_PENDING_CODE = 'refund_request_pending'

export function isRefundRequestPendingError(error: unknown): boolean {
  return error instanceof AdminApiError && error.code === REFUND_REQUEST_PENDING_CODE
}

export type AdminExpertCaseReviewDecisionBody = {
  line_key?: string | null
  package_plan_code: string
  decision: 'approve' | 'reject' | 'adjust'
  sellable_item_id?: string | null
  sellable_item_after?: string | null
  daily_dose?: number | null
  reason?: string | null
  is_new?: boolean
}

export async function adminListExpertCaseReviews(
  apiBase: string,
  token: string,
  query: AdminExpertCaseReviewListQuery = {}
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/customs'), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: compactQuery(query)
    })
    if (body?.status !== 'success' || !isRecord(body.data) || !Array.isArray(body.data.expert_case_reviews)) {
      throw new AdminApiError(500, '')
    }
    return body.data.expert_case_reviews.filter(isRecord)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetExpertCaseReview(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/custom/${encodeURIComponent(id)}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
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

export type AdminExpertCaseMemberDataQuery = {
  limit?: number
}

/**
 * GET /custom/{id}/member-data payload (OpenAPI / spec 32).
 * Prefer `profile.display_profile` for expert UI when present.
 */
export type AdminExpertCaseMemberData = {
  goals?: unknown
  goals_source?: unknown
  messages?: unknown
  health_report?: unknown
  profile?: {
    snapshot?: Record<string, unknown> | null
    /** Core draft: zh sections／rows for expert review UI. */
    display_profile?: {
      sections: Array<{
        id: string
        title_zh: string
        rows: Array<{ label_zh: string, value_zh: string }>
      }>
    } | null
    missing_reason?: string | null
    update?: Record<string, unknown> | null
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

/** GET /custom/{id}/member-data — case-bound conversation／goals／report／profile snapshot. */
export async function adminGetExpertCaseMemberData(
  apiBase: string,
  token: string,
  id: string,
  query: AdminExpertCaseMemberDataQuery = {}
): Promise<AdminExpertCaseMemberData> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/custom/${encodeURIComponent(id)}/member-data`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        query: compactQuery(query)
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return body.data as AdminExpertCaseMemberData
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminPatchExpertCaseReviewItem(
  apiBase: string,
  token: string,
  id: string,
  payload: AdminExpertCaseReviewDecisionBody
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/custom/${encodeURIComponent(id)}/items`),
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
    return body.data
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminResetExpertCaseReviewItems(
  apiBase: string,
  token: string,
  id: string,
  lineKey?: string | null
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/custom/${encodeURIComponent(id)}/items/reset`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: lineKey ? { line_key: lineKey } : {}
      }
    )
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

export type AdminExpertCaseFinalizeCopyGenerateBody = {
  /** When true, bypass content-hash cache (optional; default false). */
  force?: boolean
}

export type AdminExpertCaseFinalizeCopyData = {
  /** Markdown body without a leading `##` section title. */
  report_highlights: string
  /** Markdown body without a leading `##` section title. */
  expert_opinion: string
  content_hash: string
  cache_hit: boolean
}

export type AdminExpertCaseReviewSubmitBody = {
  decisions?: AdminExpertCaseReviewDecisionBody[]
  /** Expert-edited report highlights MD (optional; backend may generate if omitted). */
  report_highlights?: string
  /** Expert-edited expert opinion MD (optional; backend may generate if omitted). */
  expert_opinion?: string
}

/**
 * POST /custom/{id}/finalize-copy/generate
 * Only `awaiting_review`; already reviewed → 409.
 * `cache_hit=true` → UI soft chip only (no toast).
 */
export async function adminGenerateExpertCaseFinalizeCopy(
  apiBase: string,
  token: string,
  id: string,
  payload: AdminExpertCaseFinalizeCopyGenerateBody = {}
): Promise<AdminExpertCaseFinalizeCopyData> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/custom/${encodeURIComponent(id)}/finalize-copy/generate`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload.force ? { force: true } : { force: false }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const reportHighlights = body.data.report_highlights
    const expertOpinion = body.data.expert_opinion
    const contentHash = body.data.content_hash
    if (
      typeof reportHighlights !== 'string'
      || typeof expertOpinion !== 'string'
      || typeof contentHash !== 'string'
      || typeof body.data.cache_hit !== 'boolean'
    ) {
      throw new AdminApiError(500, '')
    }
    return {
      report_highlights: reportHighlights,
      expert_opinion: expertOpinion,
      content_hash: contentHash,
      cache_hit: body.data.cache_hit
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminSubmitExpertCaseReview(
  apiBase: string,
  token: string,
  id: string,
  payload: AdminExpertCaseReviewSubmitBody | AdminExpertCaseReviewDecisionBody[] = {}
) {
  const submitBody: AdminExpertCaseReviewSubmitBody = Array.isArray(payload)
    ? { decisions: payload }
    : payload
  const bodyPayload: Record<string, unknown> = {}
  if (submitBody.decisions?.length) {
    bodyPayload.decisions = submitBody.decisions
  }
  if (typeof submitBody.report_highlights === 'string') {
    bodyPayload.report_highlights = submitBody.report_highlights
  }
  if (typeof submitBody.expert_opinion === 'string') {
    bodyPayload.expert_opinion = submitBody.expert_opinion
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/custom/${encodeURIComponent(id)}/submit`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: bodyPayload
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return body.data
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error), readErrorCode(error))
  }
}

export async function adminExportExpertCaseReview(apiBase: string, token: string, id: string) {
  try {
    const response = await $fetch.raw(
      adminUrl(apiBase, `/custom/${encodeURIComponent(id)}/export`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      }
    )
    return {
      blob: response._data as Blob,
      filename: readContentDispositionFilename(response.headers.get('content-disposition'))
        || `expert-case-review-${id}.xlsx`
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

/** GET /weights — list weight sets (read: expert｜ops｜admin). */
export async function adminListWeightSets(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/weights'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data) || !Array.isArray(body.data.items)) {
      throw new AdminApiError(500, '')
    }
    return body.data.items
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

/** GET /weights/{id} — detail (+ provisional `daily_learning` embed; H-core schema pending). */
export async function adminGetWeightSet(apiBase: string, token: string, weightSetId: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/weights/${encodeURIComponent(weightSetId)}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
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

/** POST /weights/daily-learning-draft — clone published + proposals (core #75; not auto-publish). */
export async function adminDailyLearningDraft(
  apiBase: string,
  token: string,
  payload: { date?: string, version?: string } = {}
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, '/weights/daily-learning-draft'),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      }
    )
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

/** POST /weights/{id}/daily-learning-confirm — lock classification + apply general proposals. */
export async function adminDailyLearningConfirm(
  apiBase: string,
  token: string,
  weightSetId: string,
  payload: {
    accept_proposed?: boolean
    accepted_general_proposal_ids?: string[]
    confirmations?: Array<{
      knowledge_id: string
      classification: 'reusable' | 'personal_risk'
      classification_confirmed: true
    }>
  }
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(
        apiBase,
        `/weights/${encodeURIComponent(weightSetId)}/daily-learning-confirm`
      ),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      }
    )
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

/** POST /weights/{id}/daily-learning-confirm-safety — one safety proposal; confirm_safety must be true. */
export async function adminDailyLearningConfirmSafety(
  apiBase: string,
  token: string,
  weightSetId: string,
  proposalId: string
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(
        apiBase,
        `/weights/${encodeURIComponent(weightSetId)}/daily-learning-confirm-safety`
      ),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {
          proposal_id: proposalId,
          confirm_safety: true
        }
      }
    )
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

/** POST /weights/{id}/dry-run */
export async function adminWeightSetDryRun(
  apiBase: string,
  token: string,
  weightSetId: string,
  payload: { tag?: string | null } = {}
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/weights/${encodeURIComponent(weightSetId)}/dry-run`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      }
    )
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

/** POST /weights/{id}/publish */
export async function adminWeightSetPublish(
  apiBase: string,
  token: string,
  weightSetId: string,
  payload: { override_reason?: string | null } = {}
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/weights/${encodeURIComponent(weightSetId)}/publish`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      }
    )
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

function readContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null
  }
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1])
    } catch {
      return utf[1]
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? null
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

export type AdminPaymentSettings = {
  provider: 'sandbox' | 'newebpay'
  payment_methods: string[]
  updated_at: string | null
}

export async function adminGetPaymentSettings(apiBase: string, token: string): Promise<AdminPaymentSettings> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/payment-settings'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const provider = body.data.provider === 'newebpay' ? 'newebpay' : 'sandbox'
    const methods = Array.isArray(body.data.payment_methods)
      ? body.data.payment_methods.filter((m): m is string => typeof m === 'string')
      : []
    return {
      provider,
      payment_methods: methods,
      updated_at: typeof body.data.updated_at === 'string' ? body.data.updated_at : null
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminPatchPaymentSettings(
  apiBase: string,
  token: string,
  provider: 'sandbox' | 'newebpay'
): Promise<AdminPaymentSettings> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/payment-settings'), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: { provider }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const next = body.data.provider === 'newebpay' ? 'newebpay' : 'sandbox'
    const methods = Array.isArray(body.data.payment_methods)
      ? body.data.payment_methods.filter((m): m is string => typeof m === 'string')
      : []
    return {
      provider: next,
      payment_methods: methods,
      updated_at: typeof body.data.updated_at === 'string' ? body.data.updated_at : null
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export type AdminInvoiceSettings = {
  issuer: 'sandbox' | 'ezpay'
  credentials_configured: boolean
  updated_at: string | null
}

function parseInvoiceSettings(data: Record<string, unknown>): AdminInvoiceSettings {
  return {
    issuer: data.issuer === 'ezpay' ? 'ezpay' : 'sandbox',
    credentials_configured: data.credentials_configured === true,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null
  }
}

export async function adminGetInvoiceSettings(apiBase: string, token: string): Promise<AdminInvoiceSettings> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/invoice-settings'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseInvoiceSettings(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminPatchInvoiceSettings(
  apiBase: string,
  token: string,
  issuer: 'sandbox' | 'ezpay'
): Promise<AdminInvoiceSettings> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/invoice-settings'), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: { issuer }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseInvoiceSettings(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export type AdminBiomarkerInterpretationSettings = {
  max_llm_calls_per_read: number | null
  updated_at: string | null
}

function parseMaxLlmCallsPerRead(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  if (value === '' || value === 0) {
    return null
  }
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value
  }
  return null
}

function parseBiomarkerInterpretationSettings(data: Record<string, unknown>): AdminBiomarkerInterpretationSettings {
  return {
    max_llm_calls_per_read: parseMaxLlmCallsPerRead(data.max_llm_calls_per_read),
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null
  }
}

export function normalizeBiomarkerMaxLlmDraft(draft: string): number | null | 'invalid' {
  const trimmed = draft.trim()
  if (!trimmed) {
    return null
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'invalid'
  }
  const parsed = Number.parseInt(trimmed, 10)
  if (parsed < 1) {
    return null
  }
  return parsed
}

export async function adminGetBiomarkerInterpretationSettings(
  apiBase: string,
  token: string
): Promise<AdminBiomarkerInterpretationSettings> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/biomarker-interpretation-settings'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseBiomarkerInterpretationSettings(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminPatchBiomarkerInterpretationSettings(
  apiBase: string,
  token: string,
  maxLlmCallsPerRead: number | null
): Promise<AdminBiomarkerInterpretationSettings> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/biomarker-interpretation-settings'), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: { max_llm_calls_per_read: maxLlmCallsPerRead }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseBiomarkerInterpretationSettings(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminRefundOrder(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/order/${encodeURIComponent(id)}/refund`), {
      method: 'POST',
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

export async function adminRetryOrderInvoice(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/order/${encodeURIComponent(id)}/invoice/retry`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
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
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/plans'), {
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

export type AdminPackagePlan = {
  id: string
  code: string
  name_zh: string
  name_en: string | null
  description: string | null
  description_en: string | null
  price: number
  period_days: number
  pack_capacity: number
  core_count: number
  sort_order: number
  active: boolean
  original_price?: number | null
  features?: string[] | null
  features_en?: string[] | null
  badge?: string | null
  badge_en?: string | null
  highlight?: boolean | null
}

export type PackagePlanWrite = {
  name_zh?: string
  name_en?: string | null
  description?: string | null
  description_en?: string | null
  price?: number
  period_days?: number
  pack_capacity?: number
  core_count?: number
  sort_order?: number
  active?: boolean
  original_price?: number | null
  features?: string[] | null
  features_en?: string[] | null
  badge?: string | null
  badge_en?: string | null
  highlight?: boolean | null
}

export async function adminGetPackagePlan(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/plan/${encodeURIComponent(id)}`), {
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
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/plan/${encodeURIComponent(id)}`), {
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

/** Spec 33 — expert_plans catalog (list／get／patch；無 create). */
export type AdminExpertPlan = {
  id: string
  code: string
  package_plan_id: string
  name_zh: string
  name_en: string | null
  price: number
  active: boolean
  sort_order: number
  package_plan_name_zh?: string | null
  package_plan_code?: string | null
}

/**
 * PATCH body（OpenAPI adminExpertPlanPatch）。
 * expert 僅應送 active／sort_order；name_zh／name_en／price → 403。
 * Irice 11/4 第二輪：畫面顯示 name_en；ops／admin 可改，expert 唯讀。
 */
export type ExpertPlanWrite = {
  name_zh?: string
  name_en?: string | null
  price?: number
  active?: boolean
  sort_order?: number
}

export async function adminListExpertPlans(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/expert-plans'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readExpertPlanRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetExpertPlan(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/expert-plan/${encodeURIComponent(id)}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
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

export async function adminUpdateExpertPlan(
  apiBase: string,
  token: string,
  id: string,
  payload: ExpertPlanWrite
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/expert-plan/${encodeURIComponent(id)}`),
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
    return body.data
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error), readErrorCode(error))
  }
}

/**
 * core #143：開始理貨 = POST /admin/order/{id}/shipment（定稿不自動建 shipment）。
 * 遇退款申請中 → 409 `refund_request_pending`。
 */
export async function adminStartOrderShipment(apiBase: string, token: string, orderId: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/order/${encodeURIComponent(orderId)}/shipment`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return body.data
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error), readErrorCode(error))
  }
}

export type AdminRefundRequestListQuery = {
  status?: string
  limit?: number
  offset?: number
}

export async function adminListRefundRequests(
  apiBase: string,
  token: string,
  query: AdminRefundRequestListQuery = {}
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/refund-requests'), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: compactRefundRequestQuery(query)
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readRefundRequestRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminConfirmRefundRequest(apiBase: string, token: string, id: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/refund-request/${encodeURIComponent(id)}/confirm`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
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

export async function adminRejectRefundRequest(
  apiBase: string,
  token: string,
  id: string,
  reason: string
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/refund-request/${encodeURIComponent(id)}/reject`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: { reason }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return body.data
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error), readErrorCode(error))
  }
}

function readExpertPlanRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }
  if (!isRecord(data)) {
    return []
  }
  if (Array.isArray(data.expert_plans)) {
    return data.expert_plans.filter(isRecord)
  }
  if (Array.isArray(data.items)) {
    return data.items.filter(isRecord)
  }
  return []
}

function readRefundRequestRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord)
  }
  if (!isRecord(data)) {
    return []
  }
  if (Array.isArray(data.refund_requests)) {
    return data.refund_requests.filter(isRecord)
  }
  if (Array.isArray(data.items)) {
    return data.items.filter(isRecord)
  }
  return []
}

function compactRefundRequestQuery(query: AdminRefundRequestListQuery) {
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

export async function adminListSellableItems(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/supplements'), {
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
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/supplements'), {
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
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/supplement/${encodeURIComponent(id)}`), {
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
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/supplement/${encodeURIComponent(id)}`), {
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
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, `/supplement/${encodeURIComponent(id)}`), {
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

export async function adminRefresh(apiBase: string, token: string) {
  try {
    const body = await $fetch<AdminSuccess<OperatorLoginData>>(adminUrl(apiBase, '/auth/refresh'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
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

/** Admin `llm_usage` 用途類別（core `by_category_model[].category`）。 */
export type LlmUsageCategory = 'chat' | 'report' | 'decision' | 'other'

/**
 * Admin `llm_usage` 匯率資訊（core 查中央銀行 WebAPI 並快取）。
 * `rate_date`＝匯率日期；`fetched_at`＝查詢時間。舊欄 `effective_from` 當 `rate_date` fallback。
 * `source` 由 core 回傳完整字串（例如「中央銀行 新臺幣/美元 銀行間收盤匯率 (…)」）；admin 不寫死。
 */
export type LlmUsageFx = {
  base: string
  quote: string
  rate: string | null
  rate_date: string | null
  fetched_at: string | null
  source: string | null
}

/** Admin `llm_usage` per-model row（缺欄時 tokens 降級為 0；舊回應無 cost_known 視為 true）。 */
export type LlmUsageByModel = {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_ntd: string | null
  estimated_cost_usd: string | null
  /** core 回傳 TWD；無匯率或成本未知時為 null。admin 不自行換算。 */
  cost_twd: string | null
  cost_known: boolean
}

/** Admin `llm_usage` 類別 × model 列。 */
export type LlmUsageByCategoryModel = LlmUsageByModel & {
  category: string
}

/** Admin `llm_usage` 決策用途 × model 列（`purpose` 取代 category）。 */
export type LlmUsageByPurposeModel = LlmUsageByModel & {
  purpose: string
}

/**
 * Admin `llm_usage` 加總。
 * 向後相容：無 `by_model`／`by_category_model`／`decision_by_purpose_model` → 空陣列；
 * 無 cache／cost_*／fx 時給安全預設。
 */
export type LlmUsageSummaryPayload = {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_ntd: string | null
  estimated_cost_usd: string | null
  cost_twd: string | null
  cost_complete: boolean
  fx: LlmUsageFx | null
  by_model: LlmUsageByModel[]
  by_category_model: LlmUsageByCategoryModel[]
  decision_by_purpose_model: LlmUsageByPurposeModel[]
}

function llmUsageAsInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.trunc(Number(value)))
  }
  return 0
}

function llmUsageCostText(value: unknown, digits: number): string {
  const fallback = (0).toFixed(digits)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(digits)
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) {
      return n.toFixed(digits)
    }
    return value.trim()
  }
  return fallback
}

/** 允許 null（未知單價／cost_complete=false）；空字串與 null 都回 null。 */
function llmUsageNullableCost(value: unknown, digits: number): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string' && !value.trim()) {
    return null
  }
  return llmUsageCostText(value, digits)
}

function llmUsageCostKnown(value: unknown): boolean {
  return value !== false
}

function readLlmUsageTokenRow(value: Record<string, unknown>): {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  estimated_cost_ntd: string | null
  estimated_cost_usd: string | null
  cost_twd: string | null
  cost_known: boolean
} {
  const cost_known = llmUsageCostKnown(value.cost_known)
  const estimated_cost_ntd = cost_known
    ? llmUsageCostText(value.estimated_cost_ntd, 2)
    : llmUsageNullableCost(value.estimated_cost_ntd, 2)
  const estimated_cost_usd = cost_known
    ? llmUsageCostText(value.estimated_cost_usd, 4)
    : llmUsageNullableCost(value.estimated_cost_usd, 4)
  // cost_twd：無匯率／未知成本時為 null；不把 0 當缺省強制填入
  const cost_twd = llmUsageNullableCost(value.cost_twd, 2)
  return {
    input_tokens: llmUsageAsInt(value.input_tokens),
    output_tokens: llmUsageAsInt(value.output_tokens),
    cache_read_tokens: llmUsageAsInt(value.cache_read_tokens),
    cache_write_tokens: llmUsageAsInt(value.cache_write_tokens),
    estimated_cost_ntd,
    estimated_cost_usd,
    cost_twd,
    cost_known
  }
}

function readLlmUsageByModelRow(value: unknown): LlmUsageByModel | null {
  if (!isRecord(value)) {
    return null
  }
  const model = typeof value.model === 'string' ? value.model.trim() : ''
  return {
    model,
    ...readLlmUsageTokenRow(value)
  }
}

function readLlmUsageByCategoryModelRow(value: unknown): LlmUsageByCategoryModel | null {
  if (!isRecord(value)) {
    return null
  }
  const category = typeof value.category === 'string' ? value.category.trim() : ''
  if (!category) {
    return null
  }
  const model = typeof value.model === 'string' ? value.model.trim() : ''
  return {
    category,
    model,
    ...readLlmUsageTokenRow(value)
  }
}

function readLlmUsageByPurposeModelRow(value: unknown): LlmUsageByPurposeModel | null {
  if (!isRecord(value)) {
    return null
  }
  const purpose = typeof value.purpose === 'string' ? value.purpose.trim() : ''
  if (!purpose) {
    return null
  }
  const model = typeof value.model === 'string' ? value.model.trim() : ''
  return {
    purpose,
    model,
    ...readLlmUsageTokenRow(value)
  }
}

function readLlmUsageFxRate(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    return trimmed
  }
  return null
}

function readLlmUsageFx(value: unknown): LlmUsageFx | null {
  if (!isRecord(value)) {
    return null
  }
  const base = typeof value.base === 'string' && value.base.trim() ? value.base.trim() : 'USD'
  const quote = typeof value.quote === 'string' && value.quote.trim() ? value.quote.trim() : 'TWD'
  const rate = readLlmUsageFxRate(value.rate)
  // rate_date＝匯率日期；相容讀舊欄 effective_from
  const rate_date = llmUsageOptionalText(value.rate_date)
    ?? llmUsageOptionalText(value.effective_from)
  const fetched_at = llmUsageOptionalText(value.fetched_at)
  const source = llmUsageOptionalText(value.source)
  return {
    base,
    quote,
    rate,
    rate_date,
    fetched_at,
    source
  }
}

function llmUsageOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

/**
 * 正規化 admin `llm_usage`。非物件／null → null；
 * 缺 `by_model`／`by_category_model`／`decision_by_purpose_model` 或非陣列 → 對應空陣列。
 * 無 `fx` 或非物件 → null（顯示端只出 USD）。
 */
export function readLlmUsage(value: unknown): LlmUsageSummaryPayload | null {
  if (!isRecord(value)) {
    return null
  }
  const by_model: LlmUsageByModel[] = []
  if (Array.isArray(value.by_model)) {
    for (const row of value.by_model) {
      const parsed = readLlmUsageByModelRow(row)
      if (parsed) {
        by_model.push(parsed)
      }
    }
  }
  const by_category_model: LlmUsageByCategoryModel[] = []
  if (Array.isArray(value.by_category_model)) {
    for (const row of value.by_category_model) {
      const parsed = readLlmUsageByCategoryModelRow(row)
      if (parsed) {
        by_category_model.push(parsed)
      }
    }
  }
  const decision_by_purpose_model: LlmUsageByPurposeModel[] = []
  if (Array.isArray(value.decision_by_purpose_model)) {
    for (const row of value.decision_by_purpose_model) {
      const parsed = readLlmUsageByPurposeModelRow(row)
      if (parsed) {
        decision_by_purpose_model.push(parsed)
      }
    }
  }
  const cost_complete = value.cost_complete !== false
  const estimated_cost_ntd = cost_complete
    ? llmUsageCostText(value.estimated_cost_ntd, 2)
    : llmUsageNullableCost(value.estimated_cost_ntd, 2)
  const estimated_cost_usd = cost_complete
    ? llmUsageCostText(value.estimated_cost_usd, 4)
    : llmUsageNullableCost(value.estimated_cost_usd, 4)
  const cost_twd = llmUsageNullableCost(value.cost_twd, 2)
  const fx = Object.prototype.hasOwnProperty.call(value, 'fx')
    ? readLlmUsageFx(value.fx)
    : null
  return {
    input_tokens: llmUsageAsInt(value.input_tokens),
    output_tokens: llmUsageAsInt(value.output_tokens),
    cache_read_tokens: llmUsageAsInt(value.cache_read_tokens),
    cache_write_tokens: llmUsageAsInt(value.cache_write_tokens),
    estimated_cost_ntd,
    estimated_cost_usd,
    cost_twd,
    cost_complete,
    fx,
    by_model,
    by_category_model,
    decision_by_purpose_model
  }
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
    // 透傳整包 llm_usage（含可選 by_model[]）；元件端 readLlmUsage 再正規化
    return {
      messages: data.messages.filter(isRecord),
      llm_usage: isRecord(data.llm_usage) ? data.llm_usage : null
    }
  }
  throw new AdminApiError(500, '')
}

export async function adminListKnowledgeDatasets(
  apiBase: string,
  token: string,
  query: KnowledgeDatasetListQuery = {}
): Promise<KnowledgeDataset[]> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/datasets'), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: compactKnowledgeDatasetQuery(query)
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readKnowledgeDatasetRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetKnowledgeDataset(
  apiBase: string,
  token: string,
  id: string
): Promise<KnowledgeDataset> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/knowledge/datasets/${encodeURIComponent(id)}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseKnowledgeDataset(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminPatchKnowledgeDataset(
  apiBase: string,
  token: string,
  id: string,
  payload: KnowledgeDatasetPatch
): Promise<KnowledgeDataset> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/knowledge/datasets/${encodeURIComponent(id)}`),
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
    return parseKnowledgeDataset(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminListKnowledgeChunks(
  apiBase: string,
  token: string,
  query: KnowledgeChunkListQuery = {}
): Promise<KnowledgeChunk[]> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/chunks'), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: compactKnowledgeChunkQuery(query)
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return readKnowledgeChunkRows(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminApproveKnowledgeChunk(
  apiBase: string,
  token: string,
  id: string
): Promise<KnowledgeChunk> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/knowledge/chunks/${encodeURIComponent(id)}/approve`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseKnowledgeChunk(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetKnowledgeOverview(
  apiBase: string,
  token: string
): Promise<Record<string, unknown>> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/overview'), {
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

export async function adminGetKnowledgeConfig(
  apiBase: string,
  token: string
): Promise<Record<string, unknown>> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/config'), {
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

export async function adminListKnowledgeDatasetGroups(
  apiBase: string,
  token: string
): Promise<KnowledgeDatasetGroup[]> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/dataset-groups'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    const rows = Array.isArray(body.data)
      ? body.data
      : isRecord(body.data) && Array.isArray(body.data.items)
        ? body.data.items
        : null
    if (!rows) {
      throw new AdminApiError(500, '')
    }
    return rows.filter(isRecord).map(parseKnowledgeDatasetGroup)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminCreateKnowledgeDatasetGroup(
  apiBase: string,
  token: string,
  payload: KnowledgeDatasetGroupCreate
): Promise<KnowledgeDatasetGroup> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/dataset-groups'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseKnowledgeDatasetGroup(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminKnowledgeRetrievalPreview(
  apiBase: string,
  token: string,
  payload: KnowledgeRetrievalPreviewRequest
): Promise<KnowledgeRetrievalPreviewResult> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/retrieval-preview'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        corpus: payload.corpus,
        query: payload.query,
        mode: payload.mode,
        top_k: payload.top_k,
        filters: payload.filters
      }
    })
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    const data = body.data
    const hits = parseRetrievalHits(data)
    const queryInfo = isRecord(data.query_info) ? data.query_info : isRecord(data.queryInfo) ? data.queryInfo : null
    const gap = parseKnowledgeGapPayload(data)
    return {
      hits,
      query_info: queryInfo,
      knowledge_gap: gap,
      raw: data
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminListKnowledgeAudit(
  apiBase: string,
  token: string,
  query: KnowledgeAuditListQuery = {}
): Promise<{ items: KnowledgeAuditEvent[], raw: Record<string, unknown>, total: number | null }> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/knowledge/audit'), {
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: compactKnowledgeAuditQuery(query)
    })
    if (body?.status !== 'success' || body.data == null) {
      throw new AdminApiError(500, '')
    }
    return {
      items: readKnowledgeAuditEvents(body.data),
      raw: knowledgeAuditRawObject(body.data),
      total: readAuditTotalCount(body.data)
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetKnowledgeAuditChunk(
  apiBase: string,
  token: string,
  id: string,
  query: { limit?: number } = {}
): Promise<{ items: KnowledgeAuditEvent[], raw: Record<string, unknown> }> {
  try {
    const params: Record<string, number> = {}
    if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
      params.limit = query.limit
    }
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/knowledge/audit/chunks/${encodeURIComponent(id)}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        query: params
      }
    )
    if (body?.status !== 'success' || body.data == null) {
      throw new AdminApiError(500, '')
    }
    return {
      items: readKnowledgeAuditEvents(body.data),
      raw: knowledgeAuditRawObject(body.data)
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminGetKnowledgeAuditDataset(
  apiBase: string,
  token: string,
  id: string,
  query: KnowledgeAuditListQuery = {}
): Promise<{ items: KnowledgeAuditEvent[], raw: Record<string, unknown> }> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/knowledge/audit/datasets/${encodeURIComponent(id)}`),
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        query: compactKnowledgeAuditQuery(query)
      }
    )
    if (body?.status !== 'success' || body.data == null) {
      throw new AdminApiError(500, '')
    }
    return {
      items: readKnowledgeAuditEvents(body.data),
      raw: knowledgeAuditRawObject(body.data)
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

export async function adminRejectKnowledgeChunk(
  apiBase: string,
  token: string,
  id: string,
  payload: { reason: string }
): Promise<KnowledgeChunk> {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/knowledge/chunks/${encodeURIComponent(id)}/reject`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      }
    )
    if (body?.status !== 'success' || !isRecord(body.data)) {
      throw new AdminApiError(500, '')
    }
    return parseKnowledgeChunk(body.data)
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    throw new AdminApiError(readStatus(error), readMessage(error))
  }
}

function readKnowledgeDatasetRows(data: unknown): KnowledgeDataset[] {
  const rows = knowledgeDatasetListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord).map(parseKnowledgeDataset)
}

function knowledgeDatasetListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.datasets)) {
    return data.datasets
  }
  if (Array.isArray(data.items)) {
    return data.items
  }
  return null
}

function parseKnowledgeDatasetGroup(row: Record<string, unknown>): KnowledgeDatasetGroup {
  return {
    group_key: stringField(row.group_key),
    display_name: stringField(row.display_name),
    sort_order: optionalNumber(row.sort_order),
    dataset_count: optionalNumber(row.dataset_count)
  }
}

function parseKnowledgeDataset(row: Record<string, unknown>): KnowledgeDataset {
  const statusParsed = parseKnowledgeDatasetStatus(row)
  return {
    id: stringField(row.id),
    code: stringField(row.code),
    name: stringField(row.name),
    corpus: optionalString(row.corpus),
    status: (statusParsed || stringField(row.status)) as KnowledgeDataset['status'],
    group_key: optionalString(row.group_key) ?? optionalString(row.group),
    source_url: optionalString(row.source_url),
    license: optionalString(row.license),
    license_url: optionalString(row.license_url),
    attribution: optionalString(row.attribution),
    default_review_mode: optionalString(row.default_review_mode)
      ?? optionalString(row.review_mode),
    document_count: optionalNumber(row.document_count),
    chunk_count: optionalNumber(row.chunk_count),
    chunks_by_review_status: isRecord(row.chunks_by_review_status)
      ? row.chunks_by_review_status as KnowledgeDataset['chunks_by_review_status']
      : null,
    last_ingested_at: optionalString(row.last_ingested_at)
  }
}

function readKnowledgeChunkRows(data: unknown): KnowledgeChunk[] {
  const rows = knowledgeChunkListOf(data)
  if (!rows) {
    throw new AdminApiError(500, '')
  }
  return rows.filter(isRecord).map(parseKnowledgeChunk)
}

function knowledgeChunkListOf(data: unknown): unknown[] | null {
  if (Array.isArray(data)) {
    return data
  }
  if (!isRecord(data)) {
    return null
  }
  if (Array.isArray(data.chunks)) {
    return data.chunks
  }
  if (Array.isArray(data.items)) {
    return data.items
  }
  if (Array.isArray(data.data)) {
    return data.data
  }
  return null
}

function parseKnowledgeChunk(row: Record<string, unknown>): KnowledgeChunk {
  const text = optionalString(row.text_preview) ?? optionalString(row.text) ?? optionalString(row.content)
  const reviewStatus = parseKnowledgeReviewStatus(row)
  return {
    id: stringField(row.id),
    review_status: (reviewStatus || stringField(row.review_status)) as KnowledgeChunk['review_status'],
    dataset_id: optionalString(row.dataset_id),
    dataset_code: optionalString(row.dataset_code),
    dataset_name: optionalString(row.dataset_name),
    document_title: optionalString(row.document_title) ?? optionalString(row.title),
    text_preview: text,
    source_url: optionalString(row.source_url),
    license: optionalString(row.license),
    attribution: optionalString(row.attribution),
    // OpenAPI uses chunk_type; older samples used chunk_kind.
    chunk_kind: optionalString(row.chunk_kind) ?? optionalString(row.chunk_type),
    group_key: optionalString(row.group_key) ?? optionalString(row.group),
    reject_reason: optionalString(row.reject_reason ?? row.rejection_reason ?? row.rejectReason)
  }
}

function stringField(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function optionalString(value: unknown): string | null {
  const text = stringField(value).trim()
  return text ? text : null
}

function optionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function compactKnowledgeDatasetQuery(query: KnowledgeDatasetListQuery) {
  const params: Record<string, string> = {}
  for (const key of ['group', 'status', 'corpus', 'code'] as const) {
    const value = query[key]
    if (typeof value === 'string' && value.trim()) {
      params[key] = value.trim()
    }
  }
  return params
}

function compactKnowledgeAuditQuery(query: KnowledgeAuditListQuery) {
  const params: Record<string, string | number> = {}
  for (const key of ['from', 'to', 'action', 'actor_id'] as const) {
    const value = query[key]
    if (typeof value === 'string' && value.trim()) {
      params[key] = value.trim()
    }
  }
  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
    params.limit = query.limit
  }
  if (typeof query.offset === 'number' && Number.isFinite(query.offset)) {
    params.offset = query.offset
  }
  return params
}

/** Exported for unit tests — keeps list query keys aligned with core admin chunks API. */
export function compactKnowledgeChunkQuery(query: KnowledgeChunkListQuery) {
  const params: Record<string, string | number> = {}
  if (typeof query.group === 'string' && query.group.trim()) {
    params.group = query.group.trim()
  }
  if (typeof query.status === 'string' && query.status.trim()) {
    params.status = query.status.trim()
  }
  if (typeof query.limit === 'number' && Number.isFinite(query.limit) && query.limit > 0) {
    params.limit = query.limit
  }
  if (typeof query.offset === 'number' && Number.isFinite(query.offset) && query.offset >= 0) {
    params.offset = query.offset
  }
  if (typeof query.cursor === 'string' && query.cursor.trim()) {
    params.cursor = query.cursor.trim()
  }
  return params
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function adminUrl(apiBase: string, path: string) {
  const base = apiBase.replace(/\/$/, '')
  return `${base}/admin${path}`
}

function compactQuery(
  query: AdminOrderListQuery | AdminExpertCaseReviewListQuery | AdminExpertCaseMemberDataQuery
) {
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

function readErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return ''
  }
  const data = (error as { data?: AdminFailure }).data
  if (typeof data?.error_code === 'string' && data.error_code.trim()) {
    return data.error_code.trim()
  }
  if (typeof data?.error_code === 'number' && Number.isFinite(data.error_code)) {
    return String(data.error_code)
  }
  return ''
}
