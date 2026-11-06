/**
 * Related e2e for 專人預約商品設定（mock）。
 * Requires: NUXT_PUBLIC_EXPERT_BOOKING_PRODUCT_MOCK=1 and a running `pnpm dev`.
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/expert-booking-product.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://127.0.0.1:3000'

function sessionFor(role) {
  return {
    token: `expert-booking-product-mock-${role}`,
    profile: {
      operator: {
        id: `op-mock-${role}`,
        role,
        email: `${role}-mock@candor.local`,
        name: `Mock ${role}`,
        status: 'active',
        last_login_at: new Date().toISOString()
      },
      expiresAt: Date.now() + 86400_000,
      issuedAt: Date.now()
    }
  }
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})

async function openAs(role) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript((payload) => {
    localStorage.setItem('candor.operator.token', payload.token)
    localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
  }, sessionFor(role))
  await page.goto(`${base}/expert-booking-product`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="expert-booking-product-form"]', { timeout: 30_000 })
  return page
}

const adminPage = await openAs('admin')
const title = await adminPage.locator('h1, [class*="title"]').first().textContent()
assert.ok(title && /預約商品|Booking product/i.test(title), `unexpected title: ${title}`)

const code = await adminPage.getByTestId('expert-booking-product-code').inputValue()
assert.equal(code, 'personal')
assert.ok(await adminPage.getByTestId('expert-booking-product-code').isDisabled())

await adminPage.getByTestId('expert-booking-product-hints').waitFor({ state: 'visible' })
const hints = await adminPage.getByTestId('expert-booking-product-hints').textContent()
assert.ok(hints && /改價只影響新訂單|Price changes apply only to new orders/i.test(hints))
assert.ok(hints && /下架後前台無法預約|When inactive, the storefront cannot book/i.test(hints))

await adminPage.getByTestId('expert-booking-product-name-zh').fill('E2E 專人預約')
await adminPage.getByTestId('expert-booking-product-price').fill('2880')
await adminPage.getByTestId('expert-booking-product-save').click()
await adminPage.waitForSelector('[data-testid="expert-booking-product-save-ok"]', { timeout: 10_000 })
await adminPage.close()

const opsPage = await openAs('ops')
await opsPage.waitForSelector('[data-testid="expert-booking-product-readonly"]', { timeout: 10_000 })
assert.ok(await opsPage.getByTestId('expert-booking-product-name-zh').isDisabled())
assert.ok(await opsPage.getByTestId('expert-booking-product-save').isDisabled())
await opsPage.close()

console.log('expert-booking-product e2e ok')
await browser.close()
