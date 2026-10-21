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

export type AdminExpertCaseReviewListQuery = {
  status?: string
  limit?: number
  offset?: number
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
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/expert-case-reviews'), {
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
      adminUrl(apiBase, `/expert-case-review/${encodeURIComponent(id)}`),
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

/** GET /expert-case-review/{id}/member-data — case-bound conversation／goals／report／profile snapshot. */
export async function adminGetExpertCaseMemberData(
  apiBase: string,
  token: string,
  id: string,
  query: AdminExpertCaseMemberDataQuery = {}
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/expert-case-review/${encodeURIComponent(id)}/member-data`),
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
    return body.data
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
      adminUrl(apiBase, `/expert-case-review/${encodeURIComponent(id)}/items`),
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
      adminUrl(apiBase, `/expert-case-review/${encodeURIComponent(id)}/items/reset`),
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

export async function adminSubmitExpertCaseReview(
  apiBase: string,
  token: string,
  id: string,
  decisions?: AdminExpertCaseReviewDecisionBody[]
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/expert-case-review/${encodeURIComponent(id)}/submit`),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: decisions ? { decisions } : {}
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

export async function adminConfirmExpertCaseReviewKnowledge(
  apiBase: string,
  token: string,
  caseId: string,
  knowledgeId: string,
  classification: 'reusable' | 'personal_risk'
) {
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(
        apiBase,
        `/expert-case-review/${encodeURIComponent(caseId)}/knowledge/${encodeURIComponent(knowledgeId)}`
      ),
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {
          classification,
          classification_confirmed: true
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

export async function adminExportExpertCaseReview(apiBase: string, token: string, id: string) {
  try {
    const response = await $fetch.raw(
      adminUrl(apiBase, `/expert-case-review/${encodeURIComponent(id)}/export`),
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
    chunk_kind: optionalString(row.chunk_kind),
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
  const params: Record<string, string> = {}
  if (typeof query.group === 'string' && query.group.trim()) {
    params.group = query.group.trim()
  }
  if (typeof query.status === 'string' && query.status.trim()) {
    params.status = query.status.trim()
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
