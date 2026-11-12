/**
 * Related e2e for 專人預約商品設定 B v2（mock）。
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
        roles: [role],
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

async function openAs(role, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport })
  await page.addInitScript((payload) => {
    localStorage.setItem('candor.operator.token', payload.token)
    localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
  }, sessionFor(role))
  await page.goto(`${base}/expert-booking-product`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="expert-booking-product-form"]', { timeout: 30_000 })
  return page
}

/** Mock 路徑不打真實 HTTP；用「已儲存」提示判定是否完成儲存。 */
async function assertNotSaved(page) {
  assert.equal(await page.getByTestId('expert-booking-product-save-ok').count(), 0)
}

// --- default layout ---
const adminPage = await openAs('admin')

assert.equal(await adminPage.getByTestId('expert-booking-product-hints').count(), 0)
assert.equal(await adminPage.getByTestId('expert-booking-product-code').count(), 0)
assert.ok(await adminPage.getByTestId('expert-booking-product-section-names').isVisible())
assert.ok(await adminPage.getByTestId('expert-booking-product-section-sale').isVisible())
assert.ok(await adminPage.getByTestId('expert-booking-product-preview').isVisible())

const priceValue = await adminPage.getByTestId('expert-booking-product-price').inputValue()
assert.ok(/1,?990/.test(priceValue), `price display: ${priceValue}`)

const updatedAt = await adminPage.getByTestId('expert-booking-product-updated-at').textContent()
assert.ok(updatedAt && /2026\/11\/01 08:00/.test(updatedAt), `updatedAt: ${updatedAt}`)

const previewPrice = await adminPage.getByTestId('expert-booking-product-preview-price').textContent()
assert.ok(previewPrice && /NT\$1,?990/.test(previewPrice), `previewPrice: ${previewPrice}`)

const previewStatus = await adminPage.getByTestId('expert-booking-product-preview-status').textContent()
assert.ok(previewStatus && /可預約|Bookable/i.test(previewStatus), `previewStatus: ${previewStatus}`)

assert.ok(await adminPage.getByTestId('navbar-secondary').isDisabled())
assert.ok(await adminPage.getByTestId('navbar-primary').isEnabled())

// --- restore ---
await adminPage.getByTestId('expert-booking-product-name-zh').fill('暫時改名')
assert.ok(!(await adminPage.getByTestId('navbar-secondary').isDisabled()))
await adminPage.getByTestId('navbar-secondary').click()
const restoredName = await adminPage.getByTestId('expert-booking-product-name-zh').inputValue()
assert.equal(restoredName, '專人預約諮詢')
assert.ok(await adminPage.getByTestId('navbar-secondary').isDisabled())

// --- price-only confirm ---
await adminPage.getByTestId('expert-booking-product-price').fill('2,880')
await adminPage.getByTestId('navbar-primary').click()
await adminPage.waitForSelector('[data-testid="expert-booking-product-confirm-ok"]', { timeout: 10_000 })
const priceDialogText = await adminPage.getByRole('dialog').textContent()
assert.ok(priceDialogText && /確定更改價格|Change the price/i.test(priceDialogText), `priceTitle: ${priceDialogText}`)
assert.ok(!/確定更改價格並下架|Change price and take offline/i.test(priceDialogText || ''))
await assertNotSaved(adminPage)
await adminPage.getByTestId('expert-booking-product-confirm-back').click()
await adminPage.waitForSelector('[data-testid="expert-booking-product-confirm-ok"]', { state: 'detached', timeout: 10_000 })
await assertNotSaved(adminPage)

await adminPage.getByTestId('navbar-primary').click()
await adminPage.waitForSelector('[data-testid="expert-booking-product-confirm-ok"]', { timeout: 10_000 })
await adminPage.getByTestId('expert-booking-product-confirm-ok').click()
await adminPage.waitForSelector('[data-testid="expert-booking-product-save-ok"]', { timeout: 10_000 })
await adminPage.close()

// --- inactive-only confirm ---
const inactivePage = await openAs('admin')
await inactivePage.getByTestId('expert-booking-product-active').click()
await inactivePage.getByTestId('navbar-primary').click()
await inactivePage.waitForSelector('[data-testid="expert-booking-product-confirm-ok"]', { timeout: 10_000 })
const inactiveDialogText = await inactivePage.getByRole('dialog').textContent()
assert.ok(inactiveDialogText && /確定下架|Take offline/i.test(inactiveDialogText), `inactiveTitle: ${inactiveDialogText}`)
assert.ok(!/確定更改價格並下架|Change price and take offline/i.test(inactiveDialogText || ''))
await assertNotSaved(inactivePage)
await inactivePage.getByTestId('expert-booking-product-confirm-back').click()
await inactivePage.waitForSelector('[data-testid="expert-booking-product-confirm-ok"]', { state: 'detached', timeout: 10_000 })
await assertNotSaved(inactivePage)
await inactivePage.close()

// --- price + inactive single modal ---
const bothPage = await openAs('admin')
await bothPage.getByTestId('expert-booking-product-price').fill('3,500')
await bothPage.getByTestId('expert-booking-product-active').click()
await bothPage.getByTestId('navbar-primary').click()
await bothPage.waitForSelector('[data-testid="expert-booking-product-confirm-ok"]', { timeout: 10_000 })
const bothDialogText = await bothPage.getByRole('dialog').textContent()
assert.ok(bothDialogText && /確定更改價格並下架|Change price and take offline/i.test(bothDialogText), `bothTitle: ${bothDialogText}`)
assert.equal(await bothPage.getByTestId('expert-booking-product-confirm-modal').count(), 1)
await assertNotSaved(bothPage)
await bothPage.getByTestId('expert-booking-product-confirm-back').click()
await bothPage.waitForSelector('[data-testid="expert-booking-product-confirm-ok"]', { state: 'detached', timeout: 10_000 })
await assertNotSaved(bothPage)
await bothPage.close()

// --- ops readonly ---
const opsPage = await openAs('ops')
assert.equal(await opsPage.getByTestId('expert-booking-product-readonly').count(), 0)
assert.ok(await opsPage.getByTestId('expert-booking-product-name-zh').isDisabled())
assert.ok(await opsPage.getByTestId('expert-booking-product-price').isDisabled())
assert.ok(await opsPage.getByTestId('expert-booking-product-active').isDisabled())
assert.equal(await opsPage.getByTestId('navbar-primary').count(), 0)
assert.equal(await opsPage.getByTestId('navbar-secondary').count(), 0)
assert.ok(await opsPage.getByTestId('expert-booking-product-preview').isVisible())
await opsPage.close()

console.log('expert-booking-product e2e ok')
await browser.close()
