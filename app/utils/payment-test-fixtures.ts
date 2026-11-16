import type {
  PaymentTestActionResult,
  PaymentTestAuditLog,
  PaymentTestCreateResult,
  PaymentTestCredentialsConfigured,
  PaymentTestEnvironment,
  PaymentTestGetResult,
  PaymentTestListResult,
  PaymentTestOrder,
  PaymentTestAuditLogListResult
} from '~/types/payment-test'

export const PAYMENT_TEST_SCOPE_NOTE
  = 'This admin payment test does not exercise the member front-end checkout flow (conversation-bound orders, profile checks, or callbacks that update real orders).'

const CREDENTIALS: PaymentTestCredentialsConfigured = {
  newebpay: true,
  ezpay: true
}

const OPERATOR_ID = '00000000-0000-4000-8000-0000000000ad'

let orders: PaymentTestOrder[] = []
let auditLogs: PaymentTestAuditLog[] = []
let seq = 1

function nowIso() {
  return new Date().toISOString()
}

function uuid(prefix: string) {
  const n = String(seq++).padStart(4, '0')
  return `${prefix}${n}-0000-4000-8000-000000000000`
}

function cloneOrder(row: PaymentTestOrder): PaymentTestOrder {
  return {
    ...row,
    last_provider_payload: row.last_provider_payload
      ? { ...row.last_provider_payload }
      : null
  }
}

function cloneAudit(row: PaymentTestAuditLog): PaymentTestAuditLog {
  return {
    ...row,
    result_payload: row.result_payload ? { ...row.result_payload } : null
  }
}

function seedIfEmpty() {
  if (orders.length > 0) {
    return
  }
  const createdAt = '2026-11-16T02:00:00.000Z'
  const succeeded: PaymentTestOrder = {
    id: '11111111-0000-4000-8000-000000000001',
    merchant_order_no: 'ptst_mock_succeeded_001',
    amount: 10,
    environment: 'sandbox',
    payment_status: 'succeeded',
    invoice_status: 'none',
    invoice_number: null,
    last_provider_status: 'SUCCESS',
    last_provider_message: '模擬付款成功',
    last_provider_payload: { Status: 'SUCCESS', Message: '模擬付款成功' },
    created_by_operator_id: OPERATOR_ID,
    created_at: createdAt,
    updated_at: createdAt
  }
  const pending: PaymentTestOrder = {
    id: '11111111-0000-4000-8000-000000000002',
    merchant_order_no: 'ptst_mock_pending_002',
    amount: 50,
    environment: 'sandbox',
    payment_status: 'pending',
    invoice_status: 'none',
    invoice_number: null,
    last_provider_status: 'PENDING',
    last_provider_message: '等待藍新回呼',
    last_provider_payload: { Status: 'PENDING', Message: '等待藍新回呼' },
    created_by_operator_id: OPERATOR_ID,
    created_at: '2026-11-16T01:00:00.000Z',
    updated_at: '2026-11-16T01:00:00.000Z'
  }
  orders = [succeeded, pending]
  auditLogs = [
    {
      id: '22222222-0000-4000-8000-000000000001',
      payment_test_order_id: succeeded.id,
      operator_id: OPERATOR_ID,
      action: 'pay',
      amount: 10,
      environment: 'sandbox',
      result_status: 'SUCCESS',
      result_message: '模擬付款成功',
      result_payload: { Status: 'SUCCESS' },
      created_at: createdAt
    },
    {
      id: '22222222-0000-4000-8000-000000000002',
      payment_test_order_id: pending.id,
      operator_id: OPERATOR_ID,
      action: 'pay',
      amount: 50,
      environment: 'sandbox',
      result_status: 'PENDING',
      result_message: '等待藍新回呼',
      result_payload: { Status: 'PENDING' },
      created_at: pending.created_at
    }
  ]
}

export function resetPaymentTestFixtures() {
  orders = []
  auditLogs = []
  seq = 1
}

export function fixtureListPaymentTests(limit = 20, offset = 0): PaymentTestListResult {
  seedIfEmpty()
  const sorted = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return {
    scope_note: PAYMENT_TEST_SCOPE_NOTE,
    payment_test_orders: sorted.slice(offset, offset + limit).map(cloneOrder),
    total: sorted.length,
    limit,
    offset,
    credentials_configured: { ...CREDENTIALS }
  }
}

export function fixtureListAuditLogs(
  limit = 20,
  offset = 0,
  paymentTestOrderId?: string
): PaymentTestAuditLogListResult {
  seedIfEmpty()
  const filtered = paymentTestOrderId
    ? auditLogs.filter(row => row.payment_test_order_id === paymentTestOrderId)
    : [...auditLogs]
  const sorted = filtered.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return {
    scope_note: PAYMENT_TEST_SCOPE_NOTE,
    audit_logs: sorted.slice(offset, offset + limit).map(cloneAudit),
    total: sorted.length,
    limit,
    offset
  }
}

export function fixtureGetPaymentTest(id: string): PaymentTestGetResult | null {
  seedIfEmpty()
  const order = orders.find(row => row.id === id)
  if (!order) {
    return null
  }
  const related = auditLogs
    .filter(row => row.payment_test_order_id === id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(cloneAudit)
  return {
    scope_note: PAYMENT_TEST_SCOPE_NOTE,
    payment_test_order: cloneOrder(order),
    audit_logs: related,
    credentials_configured: { ...CREDENTIALS }
  }
}

export function fixtureCreatePaymentTest(
  amount: number,
  environment: PaymentTestEnvironment
): PaymentTestCreateResult {
  seedIfEmpty()
  const stamp = nowIso()
  const id = uuid('aaaaaaaa-')
  const merchantOrderNo = `ptst_mock_${Date.now().toString(36)}`
  const order: PaymentTestOrder = {
    id,
    merchant_order_no: merchantOrderNo,
    amount,
    environment,
    payment_status: 'pending',
    invoice_status: 'none',
    invoice_number: null,
    last_provider_status: 'SUCCESS',
    last_provider_message: 'MPG ready (mock)',
    last_provider_payload: { Status: 'SUCCESS', Message: 'MPG ready (mock)' },
    created_by_operator_id: OPERATOR_ID,
    created_at: stamp,
    updated_at: stamp
  }
  const audit: PaymentTestAuditLog = {
    id: uuid('bbbbbbbb-'),
    payment_test_order_id: id,
    operator_id: OPERATOR_ID,
    action: 'pay',
    amount,
    environment,
    result_status: 'SUCCESS',
    result_message: 'MPG ready (mock)',
    result_payload: { Status: 'SUCCESS', Message: 'MPG ready (mock)' },
    created_at: stamp
  }
  orders = [order, ...orders]
  auditLogs = [audit, ...auditLogs]
  return {
    scope_note: PAYMENT_TEST_SCOPE_NOTE,
    payment_test_order: cloneOrder(order),
    mpg: {
      action: 'https://example.test/newebpay/mpg',
      MerchantID: 'MOCK_MERCHANT',
      TradeInfo: 'MOCK_TRADE_INFO',
      TradeSha: 'MOCK_TRADE_SHA',
      Version: '2.0',
      EncryptType: '0'
    },
    checkout_url: `https://example.test/api/v1/payments/newebpay/test/checkout/${merchantOrderNo}`,
    provider: {
      status: 'SUCCESS',
      message: 'MPG ready (mock)',
      payload: { Status: 'SUCCESS', Message: 'MPG ready (mock)' }
    },
    audit_log: cloneAudit(audit),
    credentials_configured: { ...CREDENTIALS }
  }
}

function updateOrder(
  id: string,
  patch: Partial<PaymentTestOrder>,
  action: PaymentTestAuditLog['action'],
  providerStatus: string,
  providerMessage: string
): PaymentTestActionResult | null {
  seedIfEmpty()
  const idx = orders.findIndex(row => row.id === id)
  if (idx < 0) {
    return null
  }
  const stamp = nowIso()
  const current = orders[idx]!
  const updated: PaymentTestOrder = {
    ...current,
    ...patch,
    last_provider_status: providerStatus,
    last_provider_message: providerMessage,
    last_provider_payload: { Status: providerStatus, Message: providerMessage },
    updated_at: stamp
  }
  orders = orders.map((row, i) => (i === idx ? updated : row))
  const audit: PaymentTestAuditLog = {
    id: uuid('cccccccc-'),
    payment_test_order_id: id,
    operator_id: OPERATOR_ID,
    action,
    amount: updated.amount,
    environment: updated.environment,
    result_status: providerStatus,
    result_message: providerMessage,
    result_payload: { Status: providerStatus, Message: providerMessage },
    created_at: stamp
  }
  auditLogs = [audit, ...auditLogs]
  return {
    scope_note: PAYMENT_TEST_SCOPE_NOTE,
    payment_test_order: cloneOrder(updated),
    provider: {
      status: providerStatus,
      message: providerMessage,
      payload: { Status: providerStatus, Message: providerMessage }
    },
    audit_log: cloneAudit(audit)
  }
}

export function fixtureRefundPaymentTest(id: string): PaymentTestActionResult | null {
  const order = orders.find(row => row.id === id) || (seedIfEmpty(), orders.find(row => row.id === id))
  if (!order) {
    return null
  }
  if (order.payment_status !== 'succeeded') {
    return updateOrder(id, {}, 'refund', 'FAILED', 'payment not succeeded (mock)')
  }
  return updateOrder(id, { payment_status: 'refunded' }, 'refund', 'SUCCESS', 'Close OK (mock)')
}

export function fixtureIssueInvoice(id: string): PaymentTestActionResult | null {
  seedIfEmpty()
  const order = orders.find(row => row.id === id)
  if (!order) {
    return null
  }
  if (order.payment_status !== 'succeeded' && order.payment_status !== 'refunded') {
    return updateOrder(id, { invoice_status: 'failed' }, 'issue_invoice', 'FAILED', 'payment not settled (mock)')
  }
  return updateOrder(
    id,
    { invoice_status: 'issued', invoice_number: `MOCK-INV-${Date.now().toString(36).toUpperCase()}` },
    'issue_invoice',
    'SUCCESS',
    'Invoice issued (mock)'
  )
}

export function fixtureVoidInvoice(id: string, reason?: string): PaymentTestActionResult | null {
  seedIfEmpty()
  const order = orders.find(row => row.id === id)
  if (!order) {
    return null
  }
  if (order.invoice_status !== 'issued') {
    return updateOrder(id, {}, 'void_invoice', 'FAILED', 'invoice not issued (mock)')
  }
  return updateOrder(
    id,
    { invoice_status: 'voided' },
    'void_invoice',
    'SUCCESS',
    reason?.trim() ? `Voided: ${reason.trim()} (mock)` : 'Invoice voided (mock)'
  )
}
