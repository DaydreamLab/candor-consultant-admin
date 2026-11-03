/**
 * Capture expert-plan admin screenshots on real pages with Playwright-mocked core admin API.
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
  name_zh: '專家方案（基礎保養）',
  name_en: 'Expert plan (basic)',
  price: 6000,
  active: true,
  sort_order: 10
}

const EXPERT_CASE = {
  id: 'ecr-ep-001',
  status: 'awaiting_review',
  user_id: 'user-001',
  user_email: 'member@example.com',
  user_display_name: '王小明',
  order_id: 'ord-ep-001',
  order_no: 'CND-EP-1001',
  expert_plan_id: EXPERT_PLAN.id,
  expert_plan_code: 'basic',
  expert_plan_name: '專家方案（基礎保養）',
  expert_plan_price: 6000,
  opening_amount: 6000,
  created_at: '2026-11-02T08:00:00+08:00',
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
  refund_request_status: 'requested',
  refund_request_display: '退款申請中',
  lines: [
    {
      kind: 'expert_plan',
      expert_plan_code: 'basic',
      expert_plan_name: '專家方案（基礎保養）',
      expert_plan_price: 6000,
      amount: 6000
    }
  ],
  payments: [
    { status: 'succeeded', method: 'card', amount: 6000 }
  ],
  shipment: null,
  package: null
}

const REFUND_REQUEST = {
  id: 'rr-001',
  order_id: ORDER.id,
  order_no: ORDER.order_no,
  status: 'requested',
  amount: 6000,
  amount_total: 6000,
  created_at: '2026-11-03T09:00:00+08:00'
}

function ok(data) {
  return JSON.stringify({ status: 'success', data })
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
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ expert_plans: [EXPERT_PLAN] })
      })
    }
    if (url.includes('/admin/expert-plan/') && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok(EXPERT_PLAN)
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
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: ok({ refund_requests: [REFUND_REQUEST] })
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
          id: 'op-admin-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
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

async function seedSession(page) {
  await page.addInitScript(() => {
    const profile = {
      operator: {
        id: 'op-admin-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        status: 'active',
        last_login_at: null
      },
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      issuedAt: Date.now()
    }
    window.localStorage.setItem('candor.operator.token', 'mock-operator-token')
    window.localStorage.setItem('candor.operator.profile', JSON.stringify(profile))
  })
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

async function shot(page, filePath) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: filePath, fullPage: true })
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,1400']
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } })
  await seedSession(page)
  await installMocks(page)
  await waitForApp(page)

  const paths = {
    list: join(outDir, 'expert-plans-list.png'),
    edit: join(outDir, 'expert-plans-edit.png'),
    pendingCases: join(outDir, 'expert-case-reviews-pending-expert-plan.png'),
    finalize: join(outDir, 'expert-case-finalize-unit-price.png'),
    refunds: join(outDir, 'refund-requests-list.png'),
    order: join(outDir, 'order-expert-plan-refund-status.png')
  }

  await page.goto(`${baseUrl}/expert-plans`, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="expert-plans-grid"]').waitFor({ state: 'visible', timeout: 30000 })
  await hideChrome(page)
  await shot(page, paths.list)

  await page.goto(`${baseUrl}/expert-plans/${EXPERT_PLAN.id}`, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="expert-plan-form"]').waitFor({ state: 'visible', timeout: 30000 })
  await hideChrome(page)
  await shot(page, paths.edit)

  await page.goto(
    `${baseUrl}/expert-case-reviews?status=awaiting_review&source=expert_plan`,
    { waitUntil: 'networkidle' }
  )
  await page.locator('[data-testid="expert-case-table"]').waitFor({ state: 'visible', timeout: 30000 })
  await hideChrome(page)
  await shot(page, paths.pendingCases)

  await page.goto(`${baseUrl}/expert-case-reviews/${EXPERT_CASE.id}`, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="expert-case-opening-amount"]').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('[data-testid="expert-case-item-unit-price"]').first().waitFor({
    state: 'visible',
    timeout: 30000
  })
  await hideChrome(page)
  await shot(page, paths.finalize)

  await page.goto(`${baseUrl}/refund-requests`, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="refund-requests-table"]').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('[data-testid="refund-request-confirm"]').waitFor({ state: 'visible', timeout: 15000 })
  await hideChrome(page)
  await shot(page, paths.refunds)

  await page.goto(`${baseUrl}/orders/${ORDER.id}`, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="order-expert-plan-section"]').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('[data-testid="order-refund-request-status"]').waitFor({ state: 'visible', timeout: 15000 })
  await hideChrome(page)
  await shot(page, paths.order)

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
