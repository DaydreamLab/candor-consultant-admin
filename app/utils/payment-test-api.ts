import type { AdminFailure, AdminSuccess } from '~/types/operator'
import type {
  PaymentTestActionResult,
  PaymentTestAuditLog,
  PaymentTestAuditLogListResult,
  PaymentTestCreateRequest,
  PaymentTestCreateResult,
  PaymentTestCredentialsConfigured,
  PaymentTestEnvironment,
  PaymentTestGetResult,
  PaymentTestIssueInvoiceRequest,
  PaymentTestListResult,
  PaymentTestMpg,
  PaymentTestOrder,
  PaymentTestPaymentStatus,
  PaymentTestInvoiceStatus,
  PaymentTestProviderResult,
  PaymentTestVoidInvoiceRequest,
  PaymentTestAuditAction
} from '~/types/payment-test'
import { AdminApiError } from '~/utils/admin-api'
import {
  fixtureCreatePaymentTest,
  fixtureGetPaymentTest,
  fixtureIssueInvoice,
  fixtureListAuditLogs,
  fixtureListPaymentTests,
  fixtureRefundPaymentTest,
  fixtureVoidInvoice
} from '~/utils/payment-test-fixtures'

/** 本機／截圖用：`NUXT_PUBLIC_PAYMENT_TEST_MOCK=1`；正式預設打 candor-core。 */
export function isPaymentTestMockEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().public.paymentTestMock)
  } catch {
    return process.env.NUXT_PUBLIC_PAYMENT_TEST_MOCK === '1'
  }
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

function parseEnvironment(value: unknown): PaymentTestEnvironment | null {
  return value === 'sandbox' || value === 'production' ? value : null
}

function parsePaymentStatus(value: unknown): PaymentTestPaymentStatus | null {
  return value === 'created'
    || value === 'pending'
    || value === 'succeeded'
    || value === 'failed'
    || value === 'refunded'
    ? value
    : null
}

function parseInvoiceStatus(value: unknown): PaymentTestInvoiceStatus | null {
  return value === 'none'
    || value === 'issued'
    || value === 'voided'
    || value === 'allowanced'
    || value === 'failed'
    ? value
    : null
}

function parseAuditAction(value: unknown): PaymentTestAuditAction | null {
  return value === 'pay'
    || value === 'refund'
    || value === 'issue_invoice'
    || value === 'void_invoice'
    || value === 'callback'
    ? value
    : null
}

function parsePayload(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null
  }
  return isRecord(value) ? value : null
}

function parseOrder(row: unknown): PaymentTestOrder | null {
  if (!isRecord(row)) {
    return null
  }
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  const merchantOrderNo = typeof row.merchant_order_no === 'string' ? row.merchant_order_no.trim() : ''
  const amount = typeof row.amount === 'number' && Number.isInteger(row.amount) ? row.amount : NaN
  const environment = parseEnvironment(row.environment)
  const paymentStatus = parsePaymentStatus(row.payment_status)
  const invoiceStatus = parseInvoiceStatus(row.invoice_status)
  const createdBy = typeof row.created_by_operator_id === 'string' ? row.created_by_operator_id.trim() : ''
  const createdAt = typeof row.created_at === 'string' ? row.created_at : ''
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : ''
  if (
    !id
    || !merchantOrderNo
    || !Number.isFinite(amount)
    || amount < 1
    || !environment
    || !paymentStatus
    || !invoiceStatus
    || !createdBy
    || !createdAt
    || !updatedAt
  ) {
    return null
  }
  return {
    id,
    merchant_order_no: merchantOrderNo,
    amount,
    environment,
    payment_status: paymentStatus,
    invoice_status: invoiceStatus,
    invoice_number: typeof row.invoice_number === 'string' ? row.invoice_number : null,
    last_provider_status: typeof row.last_provider_status === 'string' ? row.last_provider_status : null,
    last_provider_message: typeof row.last_provider_message === 'string' ? row.last_provider_message : null,
    last_provider_payload: parsePayload(row.last_provider_payload),
    created_by_operator_id: createdBy,
    created_at: createdAt,
    updated_at: updatedAt
  }
}

function parseAuditLog(row: unknown): PaymentTestAuditLog | null {
  if (!isRecord(row)) {
    return null
  }
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  const action = parseAuditAction(row.action)
  const createdAt = typeof row.created_at === 'string' ? row.created_at : ''
  if (!id || !action || !createdAt) {
    return null
  }
  return {
    id,
    payment_test_order_id: typeof row.payment_test_order_id === 'string' ? row.payment_test_order_id : null,
    operator_id: typeof row.operator_id === 'string' ? row.operator_id : null,
    action,
    amount: typeof row.amount === 'number' && Number.isFinite(row.amount) ? row.amount : null,
    environment: parseEnvironment(row.environment),
    result_status: typeof row.result_status === 'string' ? row.result_status : null,
    result_message: typeof row.result_message === 'string' ? row.result_message : null,
    result_payload: parsePayload(row.result_payload),
    created_at: createdAt
  }
}

function parseProvider(row: unknown): PaymentTestProviderResult | null {
  if (!isRecord(row)) {
    return null
  }
  if (typeof row.status !== 'string' || typeof row.message !== 'string') {
    return null
  }
  return {
    status: row.status,
    message: row.message,
    payload: isRecord(row.payload) ? row.payload : {}
  }
}

function parseMpg(row: unknown): PaymentTestMpg | null {
  if (!isRecord(row)) {
    return null
  }
  const action = typeof row.action === 'string' ? row.action : ''
  const merchantId = typeof row.MerchantID === 'string' ? row.MerchantID : ''
  const tradeInfo = typeof row.TradeInfo === 'string' ? row.TradeInfo : ''
  const tradeSha = typeof row.TradeSha === 'string' ? row.TradeSha : ''
  const version = typeof row.Version === 'string' ? row.Version : ''
  const encryptType = typeof row.EncryptType === 'string' ? row.EncryptType : ''
  if (!action || !merchantId || !tradeInfo || !tradeSha || !version || !encryptType) {
    return null
  }
  return {
    action,
    MerchantID: merchantId,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Version: version,
    EncryptType: encryptType
  }
}

function parseCredentials(row: unknown): PaymentTestCredentialsConfigured | null {
  if (!isRecord(row)) {
    return null
  }
  if (typeof row.newebpay !== 'boolean' || typeof row.ezpay !== 'boolean') {
    return null
  }
  return { newebpay: row.newebpay, ezpay: row.ezpay }
}

function parseList(data: unknown): PaymentTestListResult {
  if (!isRecord(data) || typeof data.scope_note !== 'string') {
    throw new AdminApiError(500, 'invalid payment-tests list')
  }
  const rows = Array.isArray(data.payment_test_orders)
    ? data.payment_test_orders.map(parseOrder).filter((row): row is PaymentTestOrder => Boolean(row))
    : []
  return {
    scope_note: data.scope_note,
    payment_test_orders: rows,
    total: typeof data.total === 'number' ? data.total : rows.length,
    limit: typeof data.limit === 'number' ? data.limit : 20,
    offset: typeof data.offset === 'number' ? data.offset : 0,
    credentials_configured: parseCredentials(data.credentials_configured)
  }
}

function parseAuditList(data: unknown): PaymentTestAuditLogListResult {
  if (!isRecord(data) || typeof data.scope_note !== 'string') {
    throw new AdminApiError(500, 'invalid payment-tests audit list')
  }
  const rows = Array.isArray(data.audit_logs)
    ? data.audit_logs.map(parseAuditLog).filter((row): row is PaymentTestAuditLog => Boolean(row))
    : []
  return {
    scope_note: data.scope_note,
    audit_logs: rows,
    total: typeof data.total === 'number' ? data.total : rows.length,
    limit: typeof data.limit === 'number' ? data.limit : 20,
    offset: typeof data.offset === 'number' ? data.offset : 0
  }
}

function parseGet(data: unknown): PaymentTestGetResult {
  if (!isRecord(data) || typeof data.scope_note !== 'string') {
    throw new AdminApiError(500, 'invalid payment-test get')
  }
  const order = parseOrder(data.payment_test_order)
  if (!order) {
    throw new AdminApiError(500, 'invalid payment-test order')
  }
  const logs = Array.isArray(data.audit_logs)
    ? data.audit_logs.map(parseAuditLog).filter((row): row is PaymentTestAuditLog => Boolean(row))
    : []
  return {
    scope_note: data.scope_note,
    payment_test_order: order,
    audit_logs: logs,
    credentials_configured: parseCredentials(data.credentials_configured)
  }
}

function parseCreate(data: unknown): PaymentTestCreateResult {
  if (!isRecord(data) || typeof data.scope_note !== 'string') {
    throw new AdminApiError(500, 'invalid payment-test create')
  }
  const order = parseOrder(data.payment_test_order)
  const provider = parseProvider(data.provider)
  const audit = parseAuditLog(data.audit_log)
  if (!order || !provider || !audit) {
    throw new AdminApiError(500, 'invalid payment-test create payload')
  }
  return {
    scope_note: data.scope_note,
    payment_test_order: order,
    mpg: parseMpg(data.mpg),
    checkout_url: typeof data.checkout_url === 'string' ? data.checkout_url : null,
    provider,
    audit_log: audit,
    credentials_configured: parseCredentials(data.credentials_configured)
  }
}

function parseAction(data: unknown): PaymentTestActionResult {
  if (!isRecord(data) || typeof data.scope_note !== 'string') {
    throw new AdminApiError(500, 'invalid payment-test action')
  }
  const order = parseOrder(data.payment_test_order)
  const provider = parseProvider(data.provider)
  const audit = parseAuditLog(data.audit_log)
  if (!order || !provider || !audit) {
    throw new AdminApiError(500, 'invalid payment-test action payload')
  }
  return {
    scope_note: data.scope_note,
    payment_test_order: order,
    provider,
    audit_log: audit
  }
}

export function submitPaymentTestMpgForm(mpg: PaymentTestMpg) {
  if (typeof document === 'undefined') {
    return
  }
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = mpg.action
  form.acceptCharset = 'UTF-8'
  form.style.display = 'none'
  const fields: Array<[string, string]> = [
    ['MerchantID', mpg.MerchantID],
    ['TradeInfo', mpg.TradeInfo],
    ['TradeSha', mpg.TradeSha],
    ['Version', mpg.Version],
    ['EncryptType', mpg.EncryptType]
  ]
  for (const [name, value] of fields) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}

export function openPaymentTestCheckout(result: PaymentTestCreateResult) {
  if (typeof window === 'undefined') {
    return
  }
  if (result.checkout_url) {
    window.location.assign(result.checkout_url)
    return
  }
  if (result.mpg) {
    submitPaymentTestMpgForm(result.mpg)
  }
}

export async function adminListPaymentTests(
  apiBase: string,
  token: string,
  opts: { limit?: number, offset?: number } = {}
): Promise<PaymentTestListResult> {
  const limit = opts.limit ?? 20
  const offset = opts.offset ?? 0
  if (isPaymentTestMockEnabled()) {
    return fixtureListPaymentTests(limit, offset)
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/payment-tests'), {
      headers: { Authorization: `Bearer ${token}` },
      query: { limit, offset }
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return parseList(body.data)
  } catch (error) {
    return wrap(error)
  }
}

export async function adminListPaymentTestAuditLogs(
  apiBase: string,
  token: string,
  opts: { limit?: number, offset?: number, payment_test_order_id?: string } = {}
): Promise<PaymentTestAuditLogListResult> {
  const limit = opts.limit ?? 20
  const offset = opts.offset ?? 0
  if (isPaymentTestMockEnabled()) {
    return fixtureListAuditLogs(limit, offset, opts.payment_test_order_id)
  }
  try {
    const query: Record<string, string | number> = { limit, offset }
    if (opts.payment_test_order_id) {
      query.payment_test_order_id = opts.payment_test_order_id
    }
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/payment-tests/audit-logs'), {
      headers: { Authorization: `Bearer ${token}` },
      query
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return parseAuditList(body.data)
  } catch (error) {
    return wrap(error)
  }
}

export async function adminGetPaymentTest(
  apiBase: string,
  token: string,
  id: string
): Promise<PaymentTestGetResult> {
  if (isPaymentTestMockEnabled()) {
    const row = fixtureGetPaymentTest(id)
    if (!row) {
      throw new AdminApiError(404, 'not found', 'not_found')
    }
    return row
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/payment-test/${encodeURIComponent(id)}`),
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return parseGet(body.data)
  } catch (error) {
    return wrap(error)
  }
}

export async function adminCreatePaymentTest(
  apiBase: string,
  token: string,
  input: PaymentTestCreateRequest
): Promise<PaymentTestCreateResult> {
  if (isPaymentTestMockEnabled()) {
    return fixtureCreatePaymentTest(input.amount, input.environment)
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(adminUrl(apiBase, '/payment-tests'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: input
    })
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return parseCreate(body.data)
  } catch (error) {
    return wrap(error)
  }
}

export async function adminRefundPaymentTest(
  apiBase: string,
  token: string,
  id: string
): Promise<PaymentTestActionResult> {
  if (isPaymentTestMockEnabled()) {
    const row = fixtureRefundPaymentTest(id)
    if (!row) {
      throw new AdminApiError(404, 'not found', 'not_found')
    }
    return row
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/payment-test/${encodeURIComponent(id)}/refund`),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return parseAction(body.data)
  } catch (error) {
    return wrap(error)
  }
}

export async function adminIssuePaymentTestInvoice(
  apiBase: string,
  token: string,
  id: string,
  input: PaymentTestIssueInvoiceRequest = {}
): Promise<PaymentTestActionResult> {
  if (isPaymentTestMockEnabled()) {
    const row = fixtureIssueInvoice(id)
    if (!row) {
      throw new AdminApiError(404, 'not found', 'not_found')
    }
    return row
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/payment-test/${encodeURIComponent(id)}/invoice`),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: input
      }
    )
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return parseAction(body.data)
  } catch (error) {
    return wrap(error)
  }
}

export async function adminVoidPaymentTestInvoice(
  apiBase: string,
  token: string,
  id: string,
  input: PaymentTestVoidInvoiceRequest = {}
): Promise<PaymentTestActionResult> {
  if (isPaymentTestMockEnabled()) {
    const row = fixtureVoidInvoice(id, input.reason)
    if (!row) {
      throw new AdminApiError(404, 'not found', 'not_found')
    }
    return row
  }
  try {
    const body = await $fetch<AdminSuccess<unknown>>(
      adminUrl(apiBase, `/payment-test/${encodeURIComponent(id)}/invoice/void`),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: input
      }
    )
    if (body?.status !== 'success') {
      throw new AdminApiError(500, '')
    }
    return parseAction(body.data)
  } catch (error) {
    return wrap(error)
  }
}
