/** Admin 金流測試（對齊 candor-core docs/api/admin-payment-test.md）。 */

export type PaymentTestEnvironment = 'sandbox' | 'production'

export type PaymentTestPaymentStatus
  = | 'created'
    | 'pending'
    | 'succeeded'
    | 'failed'
    | 'refunded'

export type PaymentTestInvoiceStatus
  = | 'none'
    | 'issued'
    | 'voided'
    | 'allowanced'
    | 'failed'

export type PaymentTestAuditAction
  = | 'pay'
    | 'refund'
    | 'issue_invoice'
    | 'void_invoice'
    | 'callback'

export type PaymentTestProviderResult = {
  status: string
  message: string
  payload: Record<string, unknown>
}

export type PaymentTestOrder = {
  id: string
  merchant_order_no: string
  amount: number
  environment: PaymentTestEnvironment
  payment_status: PaymentTestPaymentStatus
  invoice_status: PaymentTestInvoiceStatus
  invoice_number: string | null
  last_provider_status: string | null
  last_provider_message: string | null
  last_provider_payload: Record<string, unknown> | null
  created_by_operator_id: string
  created_at: string
  updated_at: string
}

/** 稽核列上的操作者；provider callback 為 null。 */
export type PaymentTestAuditOperator = {
  id: string
  name: string | null
  email: string | null
}

export type PaymentTestAuditLog = {
  id: string
  payment_test_order_id: string | null
  operator_id: string | null
  /** callback 列為 null；其餘為 `{ id, name, email }`（name／email 可空）。 */
  operator: PaymentTestAuditOperator | null
  action: PaymentTestAuditAction
  amount: number | null
  environment: PaymentTestEnvironment | null
  result_status: string | null
  result_message: string | null
  result_payload: Record<string, unknown> | null
  created_at: string
}

export type PaymentTestMpg = {
  action: string
  MerchantID: string
  TradeInfo: string
  TradeSha: string
  Version: string
  EncryptType: string
}

export type PaymentTestCredentialsConfigured = {
  newebpay: boolean
  ezpay: boolean
}

export type PaymentTestListResult = {
  scope_note: string
  payment_test_orders: PaymentTestOrder[]
  total: number
  limit: number
  offset: number
  credentials_configured: PaymentTestCredentialsConfigured | null
}

export type PaymentTestAuditLogListResult = {
  scope_note: string
  audit_logs: PaymentTestAuditLog[]
  total: number
  limit: number
  offset: number
}

export type PaymentTestGetResult = {
  scope_note: string
  payment_test_order: PaymentTestOrder
  audit_logs: PaymentTestAuditLog[]
  credentials_configured: PaymentTestCredentialsConfigured | null
}

export type PaymentTestCreateResult = {
  scope_note: string
  payment_test_order: PaymentTestOrder
  mpg: PaymentTestMpg | null
  checkout_url: string | null
  provider: PaymentTestProviderResult
  audit_log: PaymentTestAuditLog
  credentials_configured: PaymentTestCredentialsConfigured | null
}

export type PaymentTestActionResult = {
  scope_note: string
  payment_test_order: PaymentTestOrder
  provider: PaymentTestProviderResult
  audit_log: PaymentTestAuditLog
}

export type PaymentTestCreateRequest = {
  amount: number
  environment: PaymentTestEnvironment
}

export type PaymentTestIssueInvoiceRequest = {
  buyer_name?: string
  buyer_email?: string
  invoice_type?: 'cloud' | 'company' | 'donate' | 'member'
  invoice_carrier?: string
}

export type PaymentTestVoidInvoiceRequest = {
  reason?: string
}
