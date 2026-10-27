/**
 * Verify /settings empty-hash entry does not freeze the main thread.
 * Usage: PLAYWRIGHT_CHROMIUM_PATH=/usr/local/bin/google-chrome node scripts/verify-settings-empty-hash.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'

const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')
const session = {
  token: 'settings-empty-hash-verify-token',
  profile: {
    operator: {
      id: 'op-mock-settings-admin',
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
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})

async function withSession() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript((payload) => {
    localStorage.setItem('candor.operator.token', payload.token)
    localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
    localStorage.setItem('candor.privacy.consent.version', '1')
  }, session)
  return page
}

async function assertInteractive(page, label, expectPayment = true) {
  const t0 = Date.now()
  const ping = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="settings-panel-payment"]')
    const anchors = document.querySelector('[data-testid="settings-anchors"]')
    return {
      href: location.href,
      hash: location.hash,
      hasPaymentPanel: Boolean(panel),
      hasAnchors: Boolean(anchors),
      bodyTextLen: (document.body?.innerText || '').length
    }
  })
  const ms = Date.now() - t0
  if (ms > 4000) {
    throw new Error(`${label}: evaluate took ${ms}ms (likely freeze)`)
  }
  if (!ping.hasAnchors) {
    throw new Error(`${label}: settings anchors missing — ${JSON.stringify(ping)}`)
  }
  if (expectPayment && !ping.hasPaymentPanel) {
    throw new Error(`${label}: payment panel missing — ${JSON.stringify(ping)}`)
  }
  console.log(`OK ${label} evaluate=${ms}ms`, ping)
  return { ...ping, evaluateMs: ms }
}

const results = []

{
  const page = await withSession()
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  // Prefer zh label; fall back to EN (browser locale may redirect to /en).
  const settingsLink = page.locator('a').filter({ hasText: /^(設定|Settings)$/ }).first()
  await settingsLink.waitFor({ timeout: 30_000 })
  const href = await settingsLink.getAttribute('href')
  console.log('sidebar settings href=', href)

  await Promise.all([
    page.waitForURL(/\/settings/, { timeout: 15_000 }),
    settingsLink.click({ noWaitAfter: true })
  ])
  await page.waitForSelector('[data-testid="settings-anchors"]', { timeout: 15_000 })
  // Repeat evaluate several times — freeze path timed out on subsequent evaluates.
  for (let i = 0; i < 5; i++) {
    results.push(await assertInteractive(page, `sidebar→settings#${i}`))
  }
  if (!String(href || '').includes('#payment') && !page.url().includes('#payment')) {
    console.warn('note: sidebar href/url missing #payment after click — empty-hash path still must stay interactive')
  }
  await page.close()
}

{
  const page = await withSession()
  // Direct empty-hash entry (the freeze path on tip before fix).
  await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('[data-testid="settings-anchors"]', { timeout: 15_000 })
  for (let i = 0; i < 5; i++) {
    results.push(await assertInteractive(page, `direct /settings no-hash#${i}`))
  }
  // URL may stay without hash (by design); UI still shows payment.
  console.log('after empty-hash goto, url=', page.url())

  for (const hash of ['#invoice', '#privacy', '#payment']) {
    const panel = hash === '#invoice' ? 'invoice' : hash === '#privacy' ? 'privacy' : 'payment'
    await page.goto(`${base}/settings${hash}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForSelector(`[data-testid="settings-panel-${panel}"]`, { timeout: 15_000 })
    const t0 = Date.now()
    const ping = await page.evaluate(() => ({ href: location.href, hash: location.hash }))
    const ms = Date.now() - t0
    if (ms > 4000) {
      throw new Error(`direct ${hash}: evaluate took ${ms}ms`)
    }
    console.log(`OK direct ${hash} evaluate=${ms}ms`, ping)
    results.push({ ...ping, evaluateMs: ms })
  }
  await page.close()
}

await browser.close()
console.log(JSON.stringify({ ok: true, count: results.length }, null, 2))
