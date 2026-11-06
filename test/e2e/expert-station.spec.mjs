/**
 * Related e2e for expert station (mock).
 * Requires: `NUXT_APP_SURFACE=expert` + `NUXT_PUBLIC_EXPERT_BOOKING_MOCK=1` and `pnpm run dev:expert`.
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/expert-station.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://localhost:3001'

const session = {
  token: 'expert-station-mock-token',
  profile: {
    operator: {
      id: 'op-expert-wang',
      role: 'expert',
      email: 'expert-mock@candor.local',
      name: '王專家',
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

await page.goto(`${base}/`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="expert-station-calendar-grid"]', { timeout: 30_000 })
const home = await page.locator('[data-testid="expert-station-calendar"]').textContent()
assert.ok(home && /共用行事曆|Shared calendar/i.test(home), 'missing calendar home title')

await page.goto(`${base}/bookings`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="expert-station-bookings"]', { timeout: 30_000 })
const body = await page.locator('[data-testid="expert-station-bookings"]').textContent()
assert.ok(body && /已付款預約|Paid bookings/i.test(body), 'missing bookings title')
assert.ok(/最後查看|Last viewed/i.test(body || ''), 'missing last-seen banner')

await page.goto(`${base}/calendar/availability`, { waitUntil: 'networkidle' })
await page.waitForSelector('main h1', { timeout: 30_000 })

console.log('expert-station e2e ok')
await browser.close()
