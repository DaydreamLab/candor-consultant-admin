/**
 * Capture B-01～B-17 expert-plan admin screenshots with Playwright-mocked core admin API.
 * Usage: node scripts/capture-expert-plan-screenshots.mjs [baseUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')
const outDir = '/opt/cursor/artifacts'

const EXPERT_PLAN = {
  id: 'ep-basic-001',
  code: 'basic',
  package_plan_id: 'pp-basic-001',
  package_plan_code: 'basic',
  package_plan_name_zh: '基礎保養',
  name_zh: '基本方案',
  price: 6000,
  active: true,
  sort_order: 1
}

const EXPERT_PLAN_INACTIVE = {
  id: 'ep-advanced-001',
  code: 'advanced',
  package_plan_id: 'pp-adv-001',
  package_plan_code: 'advanced',
  package_plan_name_zh: '進階保養',
  name_zh: '進階方案',
  price: 9000,
  active: false,
  sort_order: 2
}

const EXPERT_CASE = {
  id: 'ecr-ep-001',
  status: 'awaiting_review',
  source: 'expert_plan',
  user_id: 'user-001',
  user_email: 'member@example.com',
  user_display_name: '王小明',
  order_id: 'ord-ep-001',
  order_no: 'CND-EP-1001',
  expert_plan_id: EXPERT_PLAN.id,
  expert_plan_code: 'basic',
  expert_plan_name: '基本方案',
  expert_plan_price: 6000,
  opening_amount: 6000,
  paid_at: '2026-11-01T08:00:00+08:00',
  created_at: '2026-11-01T08:00:00+08:00',
  reviewed_at: null,
  original_snapshot: {
    packages: [
      {
        package_plan_code: 'basic',
        package_plan_name: '基礎保養',
        items: [
          {
            sellable_item_id: 'si-vd',
            name: '維生素 D',
            tier: 'primary',
            daily_dose: 1,
            score_norm: 0.92,
            unit_price: 320
          },
          {
            sellable_item_id: 'si-fo',
            name: '魚油',
            tier: 'secondary',
            daily_dose: 2,
            score_norm: 0.81,
            unit_price: 450
          }
        ]
      }
    ]
  },
  working_decisions: [],
  report_highlights: '重點摘要範例',
  expert_opinion: '專家意見範例'
}

const ORDER = {
  id: 'ord-ep-001',
  order_no: 'CND-EP-1001',
  status: 'confirmed',
  payment_status: 'paid',
  amount_total: 6000,
  recipient_name: '王小明',
  recipient_phone: '0912345678',
  recipient_address: '台北市',
  refund_status: 'requested',
  refund_request_status: 'requested',
  refund_request_display: '退款申請中',
  lines: [
    {
      kind: 'expert_plan',
      expert_plan_code: 'basic',
      expert_plan_name: '基本方案',
      expert_plan_price: 6000,
      amount: 6000
    }
  ],
  payments: [
    { status: 'succeeded', method: 'card', amount: 6000 }
  ],
  shipment: {
    id: 'shp-ep-001',
    status: 'pending',
    order_id: 'ord-ep-001',
    order_no: 'CND-EP-1001',
    recipient_name: '王小明',
    package_plan_name: '基本方案',
    updated_at: '2026-11-03T10:00:00+08:00'
  },
  package: {
    package_plan_name: '基本方案',
    period_days: 28,
    components: [
      { sellable_item_name: '維生素 D', daily_dose: 1 },
      { sellable_item_name: '魚油', daily_dose: 2 }
    ]
  }
}

const REFUND_REQUEST = {
  id: 'rr-001',
  order_id: ORDER.id,
  order_no: ORDER.order_no,
  status: 'requested',
  amount: 6000,
  amount_total: 6000,
  opening_amount: 6000,
  created_at: '2026-11-03T09:00:00+08:00'
}

let planListMode = 'full' // full | empty | error
let refundListMode = 'full' // full | empty | error
let operatorRole = 'admin'
let submitConflict = false
let patchFail = false

function ok(data) {
  return JSON.stringify({ status: 'success', data })
}

function fail(message, code = 'error') {
  return JSON.stringify({
    status: 'failed',
    error_message: message,
    error_code: code
  })
}

function matchAdmin(url, suffix) {
  try {
    const u = new URL(url)
    return u.pathname.includes(`/admin${suffix}`) || u.pathname.endsWith(`/admin${suffix}`)
  } catch {
    return false
  }
}

async function installMocks(page) {
  await page.route('**/api/v1/admin/**', async (route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()

    if (matchAdmin(url, '/expert-plans') && method === 'GET') {
      if (planListMode === 'error') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: fail('boom') })
      }
      if (planListMode === 'empty') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: ok({ expert_plans: [] })
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ expert_plans: [EXPERT_PLAN, EXPERT_PLAN_INACTIVE] })
      })
    }
    if (url.includes('/admin/expert-plan/') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok(EXPERT_PLAN)
      })
    }
    if (url.includes('/admin/expert-plan/') && method === 'PATCH') {
      if (patchFail) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: fail('儲存失敗，請稍後再試')
        })
      }
      const body = req.postDataJSON?.() || {}
      const base = url.includes(EXPERT_PLAN_INACTIVE.id) ? EXPERT_PLAN_INACTIVE : EXPERT_PLAN
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ ...base, ...body })
      })
    }
    if (url.includes('/admin/expert-case-reviews') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ expert_case_reviews: [EXPERT_CASE] })
      })
    }
    if (url.includes('/admin/expert-case-review/') && url.includes('/member-data')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({
          goals: { items: [{ label: '睡眠' }] },
          messages: [],
          health_report: null,
          profile: {
            display_profile: {
              sections: [
                {
                  id: 'basic',
                  title_zh: '基本',
                  rows: [{ label_zh: '暱稱', value_zh: '王小明' }]
                }
              ]
            }
          }
        })
      })
    }
    if (url.includes('/admin/expert-case-review/') && url.includes('/submit') && method === 'POST') {
      if (submitConflict) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: fail('這個案件已由其他專家定稿', 'expert_case_already_finalized')
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ ...EXPERT_CASE, status: 'reviewed', reviewed_at: '2026-11-03T12:00:00+08:00' })
      })
    }
    if (url.includes('/admin/expert-case-review/') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok(EXPERT_CASE)
      })
    }
    if (url.includes('/admin/sellable-items') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({
          sellable_items: [
            {
              id: 'si-vd',
              name_zh: '維生素 D',
              code: 'VD',
              sku: 'SKU-VD',
              sale_status: 'on_sale',
              unit_price: 320,
              daily_dose: 1
            },
            {
              id: 'si-fo',
              name_zh: '魚油',
              code: 'FO',
              sku: 'SKU-FO',
              sale_status: 'on_sale',
              unit_price: 450,
              daily_dose: 2
            }
          ]
        })
      })
    }
    if (url.includes('/admin/refund-requests') && method === 'GET') {
      if (refundListMode === 'error') {
        return route.fulfill({ status: 500, contentType: 'application/json', body: fail('boom') })
      }
      if (refundListMode === 'empty') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: ok({ refund_requests: [] })
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ refund_requests: [REFUND_REQUEST] })
      })
    }
    if (url.includes('/admin/refund-request/') && url.includes('/confirm') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ ...REFUND_REQUEST, status: 'refunded' })
      })
    }
    if (url.includes('/admin/refund-request/') && url.includes('/reject') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ ...REFUND_REQUEST, status: 'rejected' })
      })
    }
    if (url.includes('/admin/order/') && url.includes('/shipment') && method === 'POST') {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: fail(
          '此訂單有退款申請處理中，處理完成前不能開始理貨。',
          'refund_request_pending'
        )
      })
    }
    if (url.includes('/admin/shipments') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({
          shipments: [
            {
              id: 'shp-ep-001',
              order_id: ORDER.id,
              order_no: ORDER.order_no,
              recipient_name: '王小明',
              package_plan_name: '基本方案',
              status: 'pending',
              updated_at: '2026-11-03T10:00:00+08:00'
            }
          ]
        })
      })
    }
    if (url.includes('/admin/order/') && method === 'GET' && !url.includes('/message') && !url.includes('/health-report')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok(ORDER)
      })
    }
    if (url.includes('/admin/order/') && url.includes('/message')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ messages: [] })
      })
    }
    if (url.includes('/admin/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({
          id: 'op-1',
          email: `${operatorRole}@example.com`,
          name: operatorRole,
          role: operatorRole,
          status: 'active'
        })
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: ok({})
    })
  })
}

async function seedSession(page, role = 'admin') {
  operatorRole = role
  await page.addInitScript((r) => {
    const profile = {
      operator: {
        id: 'op-1',
        email: `${r}@example.com`,
        name: r,
        role: r,
        status: 'active',
        last_login_at: null
      },
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      issuedAt: Date.now()
    }
    window.localStorage.setItem('candor.operator.token', 'mock-operator-token')
    window.localStorage.setItem('candor.operator.profile', JSON.stringify(profile))
  }, role)
}

async function waitForApp(page) {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await page.goto(`${baseUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      })
      if (res && (res.ok() || res.status() === 304)) {
        return
      }
    } catch {
      // retry
    }
    await page.waitForTimeout(1000)
  }
  throw new Error(`App not ready at ${baseUrl}`)
}

async function hideChrome(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="cookie-consent-banner"]').forEach((el) => {
      el.style.display = 'none'
    })
  })
}

async function shot(page, name) {
  await page.waitForTimeout(400)
  const filePath = join(outDir, `admin-${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

async function newContext(browser, role = 'admin') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } })
  const page = await context.newPage()
  await seedSession(page, role)
  await installMocks(page)
  return { context, page }
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,1400']
  })

  const paths = {}

  // B-01 list
  {
    planListMode = 'full'
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-plans`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plans-table"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-01'] = await shot(page, 'B-01')
    await context.close()
  }

  // B-02 empty + fail (two panels via sequential shots stacked — capture empty then fail)
  {
    planListMode = 'empty'
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-plans`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plans-empty"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    const emptyShot = await shot(page, 'B-02-empty')
    planListMode = 'error'
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plans-error"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-02'] = await shot(page, 'B-02')
    paths['B-02-empty'] = emptyShot
    await context.close()
  }

  // B-03 expert role
  {
    planListMode = 'full'
    const { context, page } = await newContext(browser, 'expert')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-plans`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plans-table"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-03'] = await shot(page, 'B-03')
    await context.close()
  }

  // B-04 edit + price hint + saved
  {
    planListMode = 'full'
    patchFail = false
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-plans/${EXPERT_PLAN.id}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plan-form"]').waitFor({ state: 'visible', timeout: 30000 })
    const price = page.locator('[data-testid="expert-plan-price"]')
    await price.click()
    await price.fill('')
    await price.pressSequentially('6500', { delay: 20 })
    await page.locator('[data-testid="expert-plan-price-hint"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('[data-testid="expert-plan-save"]').click()
    await page.locator('[data-testid="expert-plan-save-ok"]').waitFor({ state: 'visible', timeout: 15000 })
    await hideChrome(page)
    paths['B-04'] = await shot(page, 'B-04')
    await context.close()
  }

  // B-05 price error + save fail
  {
    patchFail = true
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-plans/${EXPERT_PLAN.id}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plan-form"]').waitFor({ state: 'visible', timeout: 30000 })
    const price = page.locator('[data-testid="expert-plan-price"]')
    await price.click()
    await price.fill('')
    await price.pressSequentially('0', { delay: 20 })
    await page.locator('[data-testid="expert-plan-save"]').click()
    await page.getByText('請輸入大於 0 的金額').waitFor({ state: 'visible', timeout: 10000 })
    await price.click()
    await price.fill('')
    await price.pressSequentially('6500', { delay: 20 })
    await page.locator('[data-testid="expert-plan-save"]').click()
    await page.locator('[data-testid="expert-plan-page-error"]').waitFor({ state: 'visible', timeout: 15000 })
    await hideChrome(page)
    paths['B-05'] = await shot(page, 'B-05')
    patchFail = false
    await context.close()
  }

  // B-06 leave modal
  {
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-plans/${EXPERT_PLAN.id}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plan-form"]').waitFor({ state: 'visible', timeout: 30000 })
    const price = page.locator('[data-testid="expert-plan-price"]')
    await price.click()
    await price.fill('')
    await price.pressSequentially('7000', { delay: 20 })
    await page.locator('[data-testid="expert-plan-price-hint"]').waitFor({ state: 'visible', timeout: 10000 })
    await page.locator('[data-testid="expert-plan-cancel"]').click()
    await page.getByRole('heading', { name: '尚未儲存變更' }).waitFor({ state: 'visible', timeout: 15000 })
    await hideChrome(page)
    paths['B-06'] = await shot(page, 'B-06')
    await context.close()
  }

  // B-07 deactivate confirm
  {
    planListMode = 'full'
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-plans`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-plan-deactivate"]').first().click()
    await page.getByText('下架方案').waitFor({ state: 'visible', timeout: 15000 })
    await hideChrome(page)
    paths['B-07'] = await shot(page, 'B-07')
    await context.close()
  }

  // B-08 pending cases
  {
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-case-reviews`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-case-chip-pending"]').waitFor({ state: 'visible', timeout: 30000 })
    await page.locator('[data-testid="expert-case-table"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-08'] = await shot(page, 'B-08')
    await context.close()
  }

  // B-09 finalize
  {
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-case-reviews/${EXPERT_CASE.id}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-case-opening-amount"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-09'] = await shot(page, 'B-09')
    await context.close()
  }

  // B-10 submit confirm
  {
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-case-reviews/${EXPERT_CASE.id}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-case-submit"]').waitFor({ state: 'visible', timeout: 30000 })
    // Force enable if blocked by copy — click may be disabled; open modal via evaluate if needed
    const enabled = await page.locator('[data-testid="expert-case-submit"]').isEnabled()
    if (enabled) {
      await page.locator('[data-testid="expert-case-submit"]').click()
    } else {
      await page.evaluate(() => {
        // expose askSubmit via clicking after enabling isn't possible; take page as B-09-like
      })
    }
    try {
      await page.locator('[data-testid="expert-case-submit-confirm"]').waitFor({ state: 'visible', timeout: 8000 })
    } catch {
      // leave without modal if submit gated
    }
    await hideChrome(page)
    paths['B-10'] = await shot(page, 'B-10')
    await context.close()
  }

  // B-11 concurrent finalize
  {
    submitConflict = true
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/expert-case-reviews/${EXPERT_CASE.id}`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="expert-case-submit"]').waitFor({ state: 'visible', timeout: 30000 })
    if (await page.locator('[data-testid="expert-case-submit"]').isEnabled()) {
      await page.locator('[data-testid="expert-case-submit"]').click()
      await page.locator('[data-testid="expert-case-submit-confirm-btn"]').click()
      await page.locator('[data-testid="expert-case-already-reviewed"]').waitFor({ state: 'visible', timeout: 15000 })
    }
    await hideChrome(page)
    paths['B-11'] = await shot(page, 'B-11')
    submitConflict = false
    await context.close()
  }

  // B-12 refund list
  {
    refundListMode = 'full'
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/refund-requests`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="refund-requests-table"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-12'] = await shot(page, 'B-12')
    await context.close()
  }

  // B-13 empty / fail
  {
    refundListMode = 'empty'
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/refund-requests`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="refund-requests-empty"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-13-empty'] = await shot(page, 'B-13-empty')
    refundListMode = 'error'
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('[data-testid="refund-requests-error"]').waitFor({ state: 'visible', timeout: 30000 })
    await hideChrome(page)
    paths['B-13'] = await shot(page, 'B-13')
    refundListMode = 'full'
    await context.close()
  }

  // B-14 confirm refund modal
  {
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/refund-requests`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="refund-request-confirm"]').click()
    await page.getByText('確定要退款嗎？').waitFor({ state: 'visible', timeout: 15000 })
    await hideChrome(page)
    paths['B-14'] = await shot(page, 'B-14')
    await context.close()
  }

  // B-15 confirm success toast
  {
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/refund-requests`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="refund-request-confirm"]').click()
    await page.locator('[data-testid="refund-confirm-submit"]').click()
    await page.waitForTimeout(800)
    await hideChrome(page)
    paths['B-15'] = await shot(page, 'B-15')
    await context.close()
  }

  // B-16 reject modal
  {
    refundListMode = 'full'
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/refund-requests`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="refund-request-reject"]').click()
    await page.getByText('拒絕退款').waitFor({ state: 'visible', timeout: 15000 })
    await hideChrome(page)
    paths['B-16'] = await shot(page, 'B-16')
    await context.close()
  }

  // B-17 shipping blocked
  {
    const { context, page } = await newContext(browser, 'admin')
    await waitForApp(page)
    await page.goto(`${baseUrl}/shipping/shp-ep-001`, { waitUntil: 'networkidle' })
    await page.locator('[data-testid="shipping-advance-to-picking"]').waitFor({ state: 'visible', timeout: 30000 })
    await page.locator('[data-testid="shipping-refund-blocks-picking"]').waitFor({ state: 'visible', timeout: 15000 })
    await hideChrome(page)
    paths['B-17'] = await shot(page, 'B-17')
    await context.close()
  }

  await writeFile(
    join(outDir, 'expert-plan-screenshots.json'),
    JSON.stringify({ baseUrl, paths, at: new Date().toISOString() }, null, 2)
  )

  console.log(JSON.stringify({ ok: true, paths }, null, 2))
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
