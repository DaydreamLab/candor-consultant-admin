/**
 * Related e2e for expert station (mock), single admin+expert build.
 * Requires: `NUXT_PUBLIC_EXPERT_BOOKING_MOCK=1` and `pnpm run dev`.
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/expert-station.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://localhost:3000'

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

await page.goto(`${base}/expert/`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="expert-station-calendar-grid"]', { timeout: 30_000 })
const home = await page.locator('[data-testid="expert-station-calendar"]').textContent()
assert.ok(home && /共用行事曆|Shared calendar/i.test(home), 'missing calendar home title')

await page.goto(`${base}/expert/bookings`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="expert-station-bookings"]', { timeout: 30_000 })
const body = await page.locator('[data-testid="expert-station-bookings"]').textContent()
assert.ok(body && /已付款預約|Paid bookings/i.test(body), 'missing bookings title')
assert.ok(/最後查看|Last viewed/i.test(body || ''), 'missing last-seen banner')

await page.goto(`${base}/expert/calendar/availability`, { waitUntil: 'networkidle' })
await page.waitForSelector('main h1', { timeout: 30_000 })

console.log('expert-station e2e ok')

// Multi-role: login → choose-panel → admin + expert (roles[] driven, not email).
const multiPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await multiPage.route('**/api/v1/admin/auth/login', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'success',
      data: {
        token: 'multi-role-mock-token',
        expires_in: 86400,
        operator: {
          id: 'op-multi-role',
          role: 'admin',
          roles: ['admin', 'expert'],
          email: 'multi-role-mock@candor.local',
          name: '雙角色管理員',
          status: 'active',
          last_login_at: new Date().toISOString()
        }
      }
    })
  })
})

await multiPage.goto(`${base}/login`, { waitUntil: 'networkidle' })
await multiPage.locator('input[type="email"]').fill('multi-role-mock@candor.local')
await multiPage.locator('input[type="password"]').fill('mock-password')
await multiPage.locator('button[type="submit"]').click()
await multiPage.waitForSelector('[data-testid="choose-panel"]', { timeout: 30_000 })
assert.ok(
  /選擇進入面板|Choose a panel/i.test(await multiPage.locator('[data-testid="choose-panel"]').innerText()),
  'missing choose panel title'
)

await multiPage.locator('[data-testid="choose-panel-admin"]').click()
await multiPage.waitForSelector('[data-testid="admin-to-expert"]', { timeout: 30_000 })

await multiPage.goto(`${base}/login`, { waitUntil: 'networkidle' })
await multiPage.waitForSelector('[data-testid="choose-panel"]', { timeout: 30_000 })
await multiPage.locator('[data-testid="choose-panel-expert"]').click()
await multiPage.waitForSelector('[data-testid="expert-station-calendar-grid"]', { timeout: 30_000 })
await multiPage.waitForSelector('[data-testid="expert-to-admin"]', { timeout: 30_000 })

// Direct URL while already logged in must not bounce to choose-panel.
await multiPage.goto(`${base}/`, { waitUntil: 'networkidle' })
await multiPage.waitForSelector('[data-testid="admin-to-expert"]', { timeout: 30_000 })
assert.equal(await multiPage.locator('[data-testid="choose-panel"]').count(), 0)
await multiPage.goto(`${base}/expert/`, { waitUntil: 'networkidle' })
await multiPage.waitForSelector('[data-testid="expert-station-calendar-grid"]', { timeout: 30_000 })
assert.equal(await multiPage.locator('[data-testid="choose-panel"]').count(), 0)

console.log('multi-role choose-panel e2e ok')
await browser.close()
