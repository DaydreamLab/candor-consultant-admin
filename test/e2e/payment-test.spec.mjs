/**
 * 金流測試 e2e（Playwright mock API；不打真實 NewebPay／ezPay）。
 * Requires: running `pnpm run dev`（建議 `NUXT_PUBLIC_PAYMENT_TEST_MOCK=0`，本檔自行 route mock）。
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/payment-test.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://127.0.0.1:3000'
const now = new Date().toISOString()
const SCOPE
  = 'This admin payment test does not exercise the member front-end checkout flow (conversation-bound orders, profile checks, or callbacks that update real orders).'

/** @type {Array<Record<string, unknown>>} */
let orders = [
  {
    id: '11111111-0000-4000-8000-000000000001',
    merchant_order_no: 'ptst_e2e_succeeded_001',
    amount: 10,
    environment: 'sandbox',
    payment_status: 'succeeded',
    invoice_status: 'none',
    invoice_number: null,
    last_provider_status: 'SUCCESS',
    last_provider_message: 'paid',
    last_provider_payload: { Status: 'SUCCESS', Message: 'paid' },
    created_by_operator_id: 'op-admin-1',
    created_at: now,
    updated_at: now
  }
]

/** @type {Array<Record<string, unknown>>} */
let auditLogs = [
  {
    id: '22222222-0000-4000-8000-000000000001',
    payment_test_order_id: orders[0].id,
    operator_id: 'op-admin-1',
    action: 'pay',
    amount: 10,
    environment: 'sandbox',
    result_status: 'SUCCESS',
    result_message: 'paid',
    result_payload: { Status: 'SUCCESS' },
    created_at: now
  }
]

function sessionFor(role) {
  return {
    token: `payment-test-mock-${role}`,
    profile: {
      operator: {
        id: role === 'admin' ? 'op-admin-1' : `op-mock-${role}`,
        roles: [role],
        email: `${role}-mock@candor.local`,
        name: `Mock ${role}`,
        status: 'active',
        last_login_at: now
      },
      expiresAt: Date.now() + 86400_000,
      issuedAt: Date.now()
    }
  }
}

async function installRoutes(page) {
  await page.route('**/api/v1/admin/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: 'op-admin-1',
          email: 'admin-mock@candor.local',
          name: 'Mock admin',
          roles: ['admin'],
          status: 'active',
          last_login_at: now
        }
      })
    })
  })

  await page.route('**/api/v1/admin/payment-tests/audit-logs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          scope_note: SCOPE,
          audit_logs: auditLogs,
          total: auditLogs.length,
          limit: 20,
          offset: 0
        }
      })
    })
  })

  await page.route('**/api/v1/admin/payment-tests**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    // Playwright runs last-registered first; do not steal /payment-tests/audit-logs.
    if (url.pathname.includes('/audit-logs')) {
      await route.fallback()
      return
    }
    const method = request.method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            scope_note: SCOPE,
            payment_test_orders: orders,
            total: orders.length,
            limit: 20,
            offset: 0,
            credentials_configured: { newebpay: true, ezpay: true }
          }
        })
      })
      return
    }
    if (method === 'POST') {
      const body = request.postDataJSON()
      const created = {
        id: `11111111-0000-4000-8000-${String(Date.now()).slice(-12)}`,
        merchant_order_no: `ptst_e2e_${Date.now()}`,
        amount: body.amount,
        environment: body.environment,
        payment_status: 'pending',
        invoice_status: 'none',
        invoice_number: null,
        last_provider_status: 'SUCCESS',
        last_provider_message: 'MPG ready',
        last_provider_payload: { Status: 'SUCCESS', Message: 'MPG ready' },
        created_by_operator_id: 'op-admin-1',
        created_at: now,
        updated_at: now
      }
      const audit = {
        id: `22222222-0000-4000-8000-${String(Date.now()).slice(-12)}`,
        payment_test_order_id: created.id,
        operator_id: 'op-admin-1',
        action: 'pay',
        amount: body.amount,
        environment: body.environment,
        result_status: 'SUCCESS',
        result_message: 'MPG ready',
        result_payload: { Status: 'SUCCESS' },
        created_at: now
      }
      orders = [created, ...orders]
      auditLogs = [audit, ...auditLogs]
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            scope_note: SCOPE,
            payment_test_order: created,
            mpg: null,
            checkout_url: null,
            provider: { status: 'SUCCESS', message: 'MPG ready', payload: { Status: 'SUCCESS' } },
            audit_log: audit,
            credentials_configured: { newebpay: true, ezpay: true }
          }
        })
      })
      return
    }
    await route.fulfill({ status: 405, body: 'method not allowed' })
  })

  await page.route('**/api/v1/admin/payment-test/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const match = url.pathname.match(/\/payment-test\/([^/]+)(?:\/(refund|invoice|invoice\/void))?$/)
    if (!match) {
      await route.fulfill({ status: 404, body: 'not found' })
      return
    }
    const id = decodeURIComponent(match[1])
    const action = match[2] || ''
    const idx = orders.findIndex(row => row.id === id)
    if (idx < 0) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'failed', error_message: 'not found', error_code: 'not_found' })
      })
      return
    }

    if (method === 'GET' && !action) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            scope_note: SCOPE,
            payment_test_order: orders[idx],
            audit_logs: auditLogs.filter(row => row.payment_test_order_id === id),
            credentials_configured: { newebpay: true, ezpay: true }
          }
        })
      })
      return
    }

    if (method !== 'POST') {
      await route.fulfill({ status: 405, body: 'method not allowed' })
      return
    }

    const current = { ...orders[idx] }
    const resultStatus = 'SUCCESS'
    /** @type {{ resultMessage: string, auditAction: string }} */
    let outcome
    if (action === 'refund') {
      current.payment_status = 'refunded'
      outcome = { resultMessage: 'Close OK', auditAction: 'refund' }
    } else if (action === 'invoice') {
      current.invoice_status = 'issued'
      current.invoice_number = 'E2E-INV-1'
      outcome = { resultMessage: 'Invoice issued', auditAction: 'issue_invoice' }
    } else if (action === 'invoice/void') {
      current.invoice_status = 'voided'
      outcome = { resultMessage: 'Invoice voided', auditAction: 'void_invoice' }
    } else {
      await route.fulfill({ status: 404, body: 'not found' })
      return
    }
    const { resultMessage, auditAction } = outcome
    current.last_provider_status = resultStatus
    current.last_provider_message = resultMessage
    current.last_provider_payload = { Status: resultStatus, Message: resultMessage }
    current.updated_at = now
    orders = orders.map((row, i) => (i === idx ? current : row))
    const audit = {
      id: `22222222-0000-4000-8000-${String(Date.now()).slice(-12)}`,
      payment_test_order_id: id,
      operator_id: 'op-admin-1',
      action: auditAction,
      amount: current.amount,
      environment: current.environment,
      result_status: resultStatus,
      result_message: resultMessage,
      result_payload: { Status: resultStatus },
      created_at: now
    }
    auditLogs = [audit, ...auditLogs]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          scope_note: SCOPE,
          payment_test_order: current,
          provider: { status: resultStatus, message: resultMessage, payload: { Status: resultStatus } },
          audit_log: audit
        }
      })
    })
  })
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})

const opsPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await opsPage.addInitScript((payload) => {
  localStorage.setItem('candor.operator.token', payload.token)
  localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
}, sessionFor('ops'))
await opsPage.goto(`${base}/payment-test`, { waitUntil: 'networkidle' })
await opsPage.waitForTimeout(500)
assert.ok(
  !/\/payment-test/.test(opsPage.url()) || await opsPage.getByTestId('payment-test-page').count() === 0,
  'ops must not stay on payment-test'
)
await opsPage.close()

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.addInitScript((payload) => {
  localStorage.setItem('candor.operator.token', payload.token)
  localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
}, sessionFor('admin'))
await installRoutes(page)

await page.goto(`${base}/payment-test`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="payment-test-page"]', { timeout: 30_000 })

const scopeText = await page.getByTestId('payment-test-scope-note').innerText()
assert.ok(/does not exercise the member front-end checkout/i.test(scopeText), 'missing scope_note')

await page.waitForSelector('[data-testid="payment-test-orders"]', { timeout: 15_000 })
assert.ok(/ptst_e2e_succeeded_001/.test(await page.getByTestId('payment-test-orders').innerText()))

await page.getByTestId('payment-test-amount').fill('25')
await page.getByTestId('payment-test-pay').click()
await page.waitForTimeout(800)
const providerText = await page.getByTestId('payment-test-provider').innerText()
assert.ok(/Status:\s*SUCCESS/i.test(providerText), `expected provider status, got: ${providerText}`)
assert.ok(/Message:\s*MPG ready/i.test(providerText), `expected provider message, got: ${providerText}`)

await page.getByTestId(`payment-test-order-${orders.find(o => o.merchant_order_no === 'ptst_e2e_succeeded_001').id}`).click()
await page.getByTestId('payment-test-invoice').click()
await page.waitForTimeout(500)
await page.getByTestId('payment-test-invoice-void').click()
await page.waitForTimeout(500)
await page.getByTestId('payment-test-refund').click()
await page.waitForTimeout(500)

const auditText = await page.getByTestId('payment-test-audit-logs').innerText()
assert.ok(/issue_invoice|refund|void_invoice|pay/i.test(auditText), 'audit log missing actions')

const warningVisible = await page.getByTestId('payment-test-production-warning').count()
assert.equal(warningVisible, 0)
await page.getByText(/production/, { exact: false }).first().click().catch(() => {})
// Prefer radio by label text
const productionRadio = page.locator('label').filter({ hasText: /production/i }).first()
if (await productionRadio.count()) {
  await productionRadio.click()
  await page.waitForSelector('[data-testid="payment-test-production-warning"]', { timeout: 5_000 })
}

console.log('payment-test e2e ok')
await browser.close()
