/**
 * 整瓶加購（bottle_addon）e2e — Playwright mock API。
 * Requires: running `pnpm run dev`.
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/bottle-addon.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://127.0.0.1:3000'
const now = new Date().toISOString()

const sellableItem = {
  id: 'si-addon-1',
  code: 'OMG-BTL',
  sku: 'OMG-BTL',
  name_zh: 'Omega 整瓶',
  name_en: 'Omega bottle',
  sale_status: 'on_sale',
  active: true,
  is_core: false,
  can_co_pack: true,
  addon_eligible: true,
  bottle_price: 520,
  unit_price: 18,
  servings_per_container: 30,
  daily_dose: 1,
  daily_servings_max: 2,
  pack_capacity: 1,
  spec_text: '1000mg'
}

const orderWithAddon = {
  id: 'ord-addon-1',
  order_no: 'ORD-ADDON-1',
  status: 'confirmed',
  payment_status: 'paid',
  amount_total: 4500,
  package_amount: 3980,
  addon_amount: 520,
  package_plan_name: '進階方案',
  recipient_name: '加購測試',
  created_at: now,
  confirmed_at: now,
  paid_at: now,
  package: {
    id: 'pkg-1',
    package_plan_name: '進階方案',
    package_plan_price: 3980,
    period_days: 30,
    used_amount: 3500,
    remaining: 480,
    components: [
      {
        id: 'comp-1',
        sellable_item_name: '維生素 C',
        sku: 'VC-CAP',
        daily_dose: 2,
        unit_price: 10,
        monthly_cost: 600
      }
    ]
  },
  bottle_addons: [
    {
      sellable_item_id: 'si-addon-1',
      sellable_item_name: 'Omega 整瓶',
      sellable_item_sku: 'OMG-BTL',
      qty: 1,
      unit_price: 520,
      amount: 520
    }
  ],
  lines: [
    {
      kind: 'bottle_addon',
      sellable_item_id: 'si-addon-1',
      sellable_item_name: 'Omega 整瓶',
      sellable_item_sku: 'OMG-BTL',
      qty: 1,
      unit_price: 520,
      amount: 520
    }
  ],
  payments: [{ id: 'pay-1', method: 'card', status: 'succeeded', amount: 4500 }],
  shipment: {
    id: 'shp-addon-1',
    order_id: 'ord-addon-1',
    order_no: 'ORD-ADDON-1',
    status: 'picking',
    package_plan_name: '進階方案',
    updated_at: now
  }
}

function sessionPayload() {
  return {
    token: 'bottle-addon-mock-token',
    profile: {
      operator: {
        id: 'op-mock-ops',
        roles: ['ops', 'admin'],
        email: 'ops-mock@candor.local',
        name: 'Mock ops',
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
        data: sessionPayload().profile.operator
      })
    })
  })

  await page.route('**/api/v1/admin/orders**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { orders: [orderWithAddon] }
      })
    })
  })

  await page.route('**/api/v1/admin/order/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path.endsWith('/message')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { messages: [] } })
      })
      return
    }
    if (path.includes('/health-report')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { results: [] } })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: orderWithAddon })
    })
  })

  await page.route('**/api/v1/admin/shipments**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          shipments: [{
            id: 'shp-addon-1',
            order_id: 'ord-addon-1',
            order_no: 'ORD-ADDON-1',
            status: 'picking',
            package_plan_name: '進階方案',
            recipient_name: '加購測試',
            updated_at: now
          }]
        }
      })
    })
  })

  await page.route('**/api/v1/admin/supplements**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { sellable_items: [sellableItem] }
      })
    })
  })

  await page.route('**/api/v1/admin/supplement/**', async (route) => {
    const method = route.request().method()
    if (method === 'PATCH') {
      const body = route.request().postDataJSON() || {}
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { ...sellableItem, ...body }
        })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: sellableItem })
    })
  })
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await installRoutes(page)
await page.addInitScript((payload) => {
  localStorage.setItem('candor.operator.token', payload.token)
  localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
}, sessionPayload())

await page.goto(`${base}/orders`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="order-list-bottle-addon-badge"]', { timeout: 30_000 })
const listBadge = await page.getByTestId('order-list-bottle-addon-badge').textContent()
assert.ok(listBadge && /含加購|Has add-on/i.test(listBadge), `list badge: ${listBadge}`)

await page.goto(`${base}/orders/ord-addon-1`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="order-bottle-addons-section"]', { timeout: 30_000 })
const detailLine = await page.getByTestId('order-bottle-addon-line').first().textContent()
assert.ok(detailLine && /Omega/.test(detailLine), `detail line: ${detailLine}`)
const summaryText = await page.locator('body').innerText()
assert.ok(/方案金額|Package amount/i.test(summaryText), 'missing package_amount label')
assert.ok(/加購金額|Add-on amount/i.test(summaryText), 'missing addon_amount label')

await page.goto(`${base}/shipping/shp-addon-1`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="shipping-bottle-addons"]', { timeout: 30_000 })
const shipLine = await page.getByTestId('shipping-bottle-addon-line').first().textContent()
assert.ok(shipLine && /Omega|OMG-BTL/.test(shipLine), `shipping line: ${shipLine}`)
assert.ok(/瓶數|Bottles/i.test(await page.locator('[data-testid="shipping-bottle-addons"]').innerText()))

await page.goto(`${base}/supplements/si-addon-1`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="sellable-addon-eligible"]', { timeout: 30_000 })
const switchRoot = page.getByTestId('sellable-addon-eligible')
assert.ok(await switchRoot.count() >= 1, 'addon_eligible switch missing')

console.log('bottle-addon e2e ok')
await browser.close()
