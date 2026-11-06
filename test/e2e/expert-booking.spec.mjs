/**
 * Related e2e for 專人預約 admin list (mock).
 * Requires: NUXT_PUBLIC_EXPERT_BOOKING_MOCK=1 and a running `pnpm dev`.
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/expert-booking.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://127.0.0.1:3000'

const session = {
  token: 'expert-booking-mock-token',
  profile: {
    operator: {
      id: 'op-mock-ops',
      roles: ['ops'],
      email: 'ops-mock@candor.local',
      name: 'Mock Ops',
      status: 'active',
      last_login_at: new Date().toISOString()
    },
    expiresAt: Date.now() + 86400_000,
    issuedAt: Date.now()
  }
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

await page.addInitScript((payload) => {
  localStorage.setItem('candor.operator.token', payload.token)
  localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
}, session)

await page.goto(`${base}/expert-bookings`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="expert-bookings-table"]', { timeout: 30_000 })
const title = await page.locator('h1, [class*="title"]').first().textContent()
assert.ok(title && /專人預約|Expert bookings/i.test(title), `unexpected title: ${title}`)

await page.getByRole('link', { name: /詳情|Details/i }).first().click()
await page.waitForSelector('[data-testid="expert-booking-detail"]', { timeout: 30_000 })
await page.getByTestId('expert-booking-cancel').click()
await page.waitForSelector('[data-testid="expert-booking-cancel-modal"]', { timeout: 10_000 })
await page.getByTestId('expert-booking-cancel-confirm').click()
await page.waitForTimeout(300)

console.log('expert-booking e2e ok')
await browser.close()
