/**
 * Capture CTA catalog settings screenshots (requires NUXT_PUBLIC_CTA_CATALOG_MOCK≠0).
 * Usage: node scripts/capture-cta-catalog-screenshots.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const base = process.argv[2] || 'http://127.0.0.1:3000'
const outDir = '/opt/cursor/artifacts/screenshots'
await mkdir(outDir, { recursive: true })

const session = {
  token: 'cta-catalog-mock-token',
  profile: {
    operator: {
      id: 'op-mock-cta-admin',
      role: 'admin',
      email: 'admin-mock@candor.local',
      name: 'Mock Admin',
      status: 'active',
      last_login_at: new Date().toISOString()
    },
    expiresAt: Date.now() + 86400_000
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
  localStorage.setItem('candor.privacy.consent.version', '1')
}, session)

await page.goto(`${base}/settings#cta-catalog`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="cta-catalog-settings"]', { timeout: 30_000 })
await page.waitForSelector('[data-testid="cta-row-ask_report"]', { timeout: 30_000 })
await page.screenshot({ path: join(outDir, 'cta-catalog-list.png'), fullPage: true })

await page.click('[data-testid="cta-row-ask_vitals"]')
await page.waitForSelector('[data-testid="cta-ask-vitals-info"]')
await page.screenshot({ path: join(outDir, 'cta-catalog-edit.png'), fullPage: true })

await page.click('button:has-text("取消")')
await page.waitForSelector('[data-testid="cta-catalog-open-matrix"]')
await page.click('[data-testid="cta-catalog-open-matrix"]')
await page.waitForSelector('[data-testid="cta-matrix-hard-gate"]')
await page.screenshot({ path: join(outDir, 'cta-catalog-matrix.png'), fullPage: true })

console.log('wrote screenshots to', outDir)
await browser.close()
