import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminApiError } from './admin-api'
import {
  adminCreatePaymentTest,
  adminIssuePaymentTestInvoice,
  adminListPaymentTestAuditLogs,
  adminListPaymentTests,
  adminRefundPaymentTest,
  adminVoidPaymentTestInvoice,
  formatPaymentTestAuditOperator,
  isPaymentTestMockEnabled,
  submitPaymentTestMpgForm
} from './payment-test-api'
import { resetPaymentTestFixtures } from './payment-test-fixtures'

const fetchMock = vi.fn()

vi.stubGlobal('$fetch', fetchMock)

beforeEach(() => {
  resetPaymentTestFixtures()
  vi.unstubAllEnvs()
  process.env.NUXT_PUBLIC_PAYMENT_TEST_MOCK = '0'
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllEnvs()
})

const sampleOrder = {
  id: '11111111-0000-4000-8000-000000000099',
  merchant_order_no: 'ptst_live_099',
  amount: 10,
  environment: 'sandbox',
  payment_status: 'succeeded',
  invoice_status: 'none',
  invoice_number: null,
  last_provider_status: 'SUCCESS',
  last_provider_message: 'ok',
  last_provider_payload: { Status: 'SUCCESS' },
  created_by_operator_id: '00000000-0000-4000-8000-0000000000ad',
  created_at: '2026-11-16T03:00:00.000Z',
  updated_at: '2026-11-16T03:00:00.000Z'
}

const sampleAudit = {
  id: '22222222-0000-4000-8000-000000000099',
  payment_test_order_id: sampleOrder.id,
  operator_id: sampleOrder.created_by_operator_id,
  operator: {
    id: sampleOrder.created_by_operator_id,
    name: '系統管理員',
    email: 'admin@example.com'
  },
  action: 'pay',
  amount: 10,
  environment: 'sandbox',
  result_status: 'SUCCESS',
  result_message: 'ok',
  result_payload: { Status: 'SUCCESS' },
  created_at: '2026-11-16T03:00:00.000Z'
}

describe('payment-test-api', () => {
  it('lists payment tests against /admin/payment-tests', async () => {
    fetchMock.mockResolvedValue({
      status: 'success',
      data: {
        scope_note: 'scope',
        payment_test_orders: [sampleOrder],
        total: 1,
        limit: 20,
        offset: 0,
        credentials_configured: { newebpay: true, ezpay: false }
      }
    })
    const result = await adminListPaymentTests('https://example.test/api/v1', 'tok', {
      limit: 10,
      offset: 5
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/v1/admin/payment-tests',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok' },
        query: { limit: 10, offset: 5 }
      })
    )
    expect(result.payment_test_orders).toHaveLength(1)
    expect(result.credentials_configured).toEqual({ newebpay: true, ezpay: false })
    expect(result.scope_note).toBe('scope')
  })

  it('lists audit logs with optional order filter', async () => {
    fetchMock.mockResolvedValue({
      status: 'success',
      data: {
        scope_note: 'scope',
        audit_logs: [sampleAudit],
        total: 1,
        limit: 20,
        offset: 0
      }
    })
    const result = await adminListPaymentTestAuditLogs('https://example.test/api/v1', 'tok', {
      payment_test_order_id: sampleOrder.id
    })
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://example.test/api/v1/admin/payment-tests/audit-logs'
    )
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      query: expect.objectContaining({ payment_test_order_id: sampleOrder.id })
    })
    expect(result.audit_logs[0]?.action).toBe('pay')
    expect(result.audit_logs[0]?.operator_id).toBe(sampleOrder.created_by_operator_id)
    expect(result.audit_logs[0]?.operator).toEqual(sampleAudit.operator)
    expect(result.audit_logs[0]?.environment).toBe('sandbox')
  })

  it('parses callback audit with null operator and null environment', async () => {
    fetchMock.mockResolvedValue({
      status: 'success',
      data: {
        scope_note: 'scope',
        audit_logs: [{
          id: '22222222-0000-4000-8000-000000000098',
          payment_test_order_id: sampleOrder.id,
          operator_id: null,
          operator: null,
          action: 'callback',
          amount: 10,
          environment: null,
          result_status: 'SUCCESS',
          result_message: 'Notify OK',
          result_payload: { Status: 'SUCCESS' },
          created_at: '2026-11-16T03:05:00.000Z'
        }],
        total: 1,
        limit: 20,
        offset: 0
      }
    })
    const result = await adminListPaymentTestAuditLogs('https://example.test/api/v1', 'tok')
    expect(result.audit_logs[0]?.operator).toBeNull()
    expect(result.audit_logs[0]?.environment).toBeNull()
    expect(formatPaymentTestAuditOperator(result.audit_logs[0]!)).toBe('—')
  })

  it('formatPaymentTestAuditOperator prefers name → email → id → dash', () => {
    expect(formatPaymentTestAuditOperator({
      operator: { id: 'op-1', name: 'Alice', email: 'a@b.c' },
      operator_id: 'op-1'
    })).toBe('Alice')
    expect(formatPaymentTestAuditOperator({
      operator: { id: 'op-1', name: null, email: 'a@b.c' },
      operator_id: 'op-1'
    })).toBe('a@b.c')
    expect(formatPaymentTestAuditOperator({
      operator: { id: 'op-short', name: null, email: null },
      operator_id: null
    })).toBe('op-short')
    expect(formatPaymentTestAuditOperator({
      operator: null,
      operator_id: '11111111-0000-4000-8000-000000000001'
    })).toBe('11111111…')
    expect(formatPaymentTestAuditOperator({ operator: null, operator_id: null })).toBe('—')
  })

  it('maps 403 forbidden for admin-only payment-test API', async () => {
    fetchMock.mockRejectedValue({
      statusCode: 403,
      data: {
        status: 'failed',
        error_message: 'Admin role required.',
        error_code: 'forbidden'
      }
    })
    await expect(
      adminListPaymentTests('https://example.test/api/v1', 'tok')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'forbidden',
      message: 'Admin role required.'
    })
  })

  it('fixture audit logs include operator object and callback nulls', async () => {
    process.env.NUXT_PUBLIC_PAYMENT_TEST_MOCK = '1'
    const audits = await adminListPaymentTestAuditLogs('https://example.test/api/v1', 'tok')
    expect(audits.audit_logs.length).toBeGreaterThan(0)
    const pay = audits.audit_logs.find(row => row.action === 'pay')
    const callback = audits.audit_logs.find(row => row.action === 'callback')
    expect(pay?.operator?.name).toBe('Mock admin')
    expect(pay?.environment).toBe('sandbox')
    expect(callback?.operator).toBeNull()
    expect(callback?.environment).toBeNull()
  })

  it('creates payment test and returns mpg + provider', async () => {
    fetchMock.mockResolvedValue({
      status: 'success',
      data: {
        scope_note: 'scope',
        payment_test_order: { ...sampleOrder, payment_status: 'pending' },
        mpg: {
          action: 'https://ccore.newebpay.com/MPG/mpg_gateway',
          MerchantID: 'MID',
          TradeInfo: 'TI',
          TradeSha: 'TS',
          Version: '2.0',
          EncryptType: '0'
        },
        checkout_url: 'https://example.test/api/v1/payments/newebpay/test/checkout/ptst_live_099',
        provider: { status: 'SUCCESS', message: 'MPG ready', payload: { Status: 'SUCCESS' } },
        audit_log: sampleAudit,
        credentials_configured: { newebpay: true, ezpay: true }
      }
    })
    const created = await adminCreatePaymentTest('https://example.test/api/v1', 'tok', {
      amount: 10,
      environment: 'sandbox'
    })
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      method: 'POST',
      body: { amount: 10, environment: 'sandbox' }
    })
    expect(created.mpg?.MerchantID).toBe('MID')
    expect(created.provider.status).toBe('SUCCESS')
    expect(created.checkout_url).toContain('/payments/newebpay/test/checkout/')
  })

  it('posts refund / invoice / void endpoints', async () => {
    const actionBody = {
      status: 'success',
      data: {
        scope_note: 'scope',
        payment_test_order: sampleOrder,
        provider: { status: 'SUCCESS', message: 'ok', payload: {} },
        audit_log: sampleAudit
      }
    }
    fetchMock.mockResolvedValue(actionBody)

    await adminRefundPaymentTest('https://example.test/api/v1', 'tok', sampleOrder.id)
    expect(fetchMock.mock.calls.at(-1)![0]).toBe(
      `https://example.test/api/v1/admin/payment-test/${sampleOrder.id}/refund`
    )

    await adminIssuePaymentTestInvoice('https://example.test/api/v1', 'tok', sampleOrder.id, {
      buyer_email: 'a@b.c'
    })
    expect(fetchMock.mock.calls.at(-1)![0]).toBe(
      `https://example.test/api/v1/admin/payment-test/${sampleOrder.id}/invoice`
    )
    expect(fetchMock.mock.calls.at(-1)![1]).toMatchObject({
      method: 'POST',
      body: { buyer_email: 'a@b.c' }
    })

    await adminVoidPaymentTestInvoice('https://example.test/api/v1', 'tok', sampleOrder.id, {
      reason: 'test'
    })
    expect(fetchMock.mock.calls.at(-1)![0]).toBe(
      `https://example.test/api/v1/admin/payment-test/${sampleOrder.id}/invoice/void`
    )
  })

  it('maps API failures to AdminApiError', async () => {
    fetchMock.mockRejectedValue({
      statusCode: 403,
      data: {
        status: 'failed',
        error_message: 'forbidden',
        error_code: 'forbidden'
      }
    })
    await expect(
      adminListPaymentTests('https://example.test/api/v1', 'tok')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'forbidden'
    } satisfies Partial<AdminApiError>)
  })

  it('uses fixtures when mock flag is on', async () => {
    process.env.NUXT_PUBLIC_PAYMENT_TEST_MOCK = '1'
    expect(isPaymentTestMockEnabled()).toBe(true)
    const list = await adminListPaymentTests('https://example.test/api/v1', 'tok')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(list.payment_test_orders.length).toBeGreaterThan(0)
    expect(list.scope_note).toContain('does not exercise the member front-end checkout')

    const created = await adminCreatePaymentTest('https://example.test/api/v1', 'tok', {
      amount: 20,
      environment: 'sandbox'
    })
    expect(created.payment_test_order.amount).toBe(20)
    expect(created.provider.status).toBe('SUCCESS')

    const succeeded = list.payment_test_orders.find(row => row.payment_status === 'succeeded')!
    const refunded = await adminRefundPaymentTest('https://example.test/api/v1', 'tok', succeeded.id)
    expect(refunded.payment_test_order.payment_status).toBe('refunded')
  })

  it('builds a NewebPay MPG form for hosted checkout', () => {
    document.body.innerHTML = ''
    const submit = vi.fn()
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag)
      if (tag === 'form') {
        Object.defineProperty(el, 'submit', { value: submit })
      }
      return el
    })
    submitPaymentTestMpgForm({
      action: 'https://example.test/mpg',
      MerchantID: 'MID',
      TradeInfo: 'TI',
      TradeSha: 'TS',
      Version: '2.0',
      EncryptType: '0'
    })
    expect(submit).toHaveBeenCalled()
    const form = document.body.querySelector('form')
    expect(form?.getAttribute('action')).toBe('https://example.test/mpg')
    expect((form?.querySelector('input[name="MerchantID"]') as HTMLInputElement)?.value).toBe('MID')
  })
})
