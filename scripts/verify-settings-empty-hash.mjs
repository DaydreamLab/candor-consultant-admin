/**
 * Verify settings hub empty-hash does not freeze, and settings-split routes work.
 * Usage: PLAYWRIGHT_CHROMIUM_PATH=/usr/local/bin/google-chrome node scripts/verify-settings-empty-hash.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'

const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')

function sessionFor(role) {
  return {
    token: `settings-verify-${role}`,
    profile: {
      operator: {
        id: `op-mock-settings-${role}`,
        role,
        email: `${role}-mock@candor.local`,
        name: `Mock ${role}`,
        status: 'active',
        last_login_at: new Date().toISOString()
      },
      expiresAt: Date.now() + 86400_000
    }
  }
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})

async function withSession(role) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript((payload) => {
    localStorage.setItem('candor.operator.token', payload.token)
    localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
    localStorage.setItem('candor.privacy.consent.version', '1')
  }, sessionFor(role))
  return page
}

async function assertInteractive(page, label, { expectPayment = true, expectAnchors = true } = {}) {
  const t0 = Date.now()
  const ping = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="settings-panel-payment"]')
    const anchors = document.querySelector('[data-testid="settings-anchors"]')
    const privacyAnchor = document.querySelector('[data-testid="settings-anchor-privacy"]')
    const ctaAnchor = document.querySelector('[data-testid="settings-anchor-cta-catalog"]')
    return {
      href: location.href,
      hash: location.hash,
      hasPaymentPanel: Boolean(panel),
      hasAnchors: Boolean(anchors),
      hasPrivacyAnchor: Boolean(privacyAnchor),
      hasCtaAnchor: Boolean(ctaAnchor),
      bodyTextLen: (document.body?.innerText || '').length
    }
  })
  const ms = Date.now() - t0
  if (ms > 4000) {
    throw new Error(`${label}: evaluate took ${ms}ms (likely freeze)`)
  }
  if (expectAnchors && !ping.hasAnchors) {
    throw new Error(`${label}: settings anchors missing — ${JSON.stringify(ping)}`)
  }
  if (expectPayment && !ping.hasPaymentPanel) {
    throw new Error(`${label}: payment panel missing — ${JSON.stringify(ping)}`)
  }
  if (ping.hasPrivacyAnchor || ping.hasCtaAnchor) {
    throw new Error(`${label}: hub still exposes privacy/CTA anchors — ${JSON.stringify(ping)}`)
  }
  console.log(`OK ${label} evaluate=${ms}ms`, ping)
  return { ...ping, evaluateMs: ms }
}

const results = []

{
  const page = await withSession('admin')
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const settingsLink = page.locator('a').filter({ hasText: /^(設定|Settings)$/ }).first()
  await settingsLink.waitFor({ timeout: 30_000 })
  const href = await settingsLink.getAttribute('href')
  console.log('sidebar settings href=', href)

  await Promise.all([
    page.waitForURL(/\/settings/, { timeout: 15_000 }),
    settingsLink.click({ noWaitAfter: true })
  ])
  await page.waitForSelector('[data-testid="settings-anchors"]', { timeout: 15_000 })
  for (let i = 0; i < 5; i++) {
    results.push(await assertInteractive(page, `sidebar→settings#${i}`))
  }

  // Sidebar privacy / CTA
  const privacyLink = page.locator('a').filter({ hasText: /^(隱私權|Privacy)$/ }).first()
  await privacyLink.click()
  await page.waitForURL(/\/settings\/privacy/, { timeout: 15_000 })
  await page.waitForSelector('[data-testid="settings-privacy"]', { timeout: 15_000 })
  const privacyPing = await page.evaluate(() => ({
    href: location.href,
    hasCms: Boolean(document.querySelector('[data-testid="settings-privacy"]'))
  }))
  console.log('OK sidebar→privacy', privacyPing)
  results.push(privacyPing)

  const ctaLink = page.locator('a').filter({ hasText: /^(CTA 目錄|CTA catalog)$/ }).first()
  await ctaLink.click()
  await page.waitForURL(/\/settings\/cta-catalog/, { timeout: 15_000 })
  await page.waitForSelector('[data-testid="cta-catalog-settings"]', { timeout: 15_000 })
  const ctaPing = await page.evaluate(() => ({
    href: location.href,
    hasCatalog: Boolean(document.querySelector('[data-testid="cta-catalog-settings"]'))
  }))
  console.log('OK sidebar→cta-catalog', ctaPing)
  results.push(ctaPing)
  await page.close()
}

{
  const page = await withSession('admin')
  await page.goto(`${base}/settings`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('[data-testid="settings-anchors"]', { timeout: 15_000 })
  for (let i = 0; i < 5; i++) {
    results.push(await assertInteractive(page, `direct /settings no-hash#${i}`))
  }
  console.log('after empty-hash goto, url=', page.url())

  for (const hash of ['#invoice', '#payment', '#other']) {
    const panel = hash.slice(1)
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

  // Legacy hash redirects
  await page.goto(`${base}/settings#privacy`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForURL(/\/settings\/privacy/, { timeout: 15_000 })
  console.log('OK legacy #privacy →', page.url())
  await page.goto(`${base}/settings#cta-catalog`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForURL(/\/settings\/cta-catalog/, { timeout: 15_000 })
  console.log('OK legacy #cta-catalog →', page.url())
  await page.close()
}

{
  const page = await withSession('expert')
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('text=/設定|Settings/', { timeout: 30_000 })
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll('a')].map(a => (a.textContent || '').trim())
  )
  const hasCta = labels.some(t => t === 'CTA 目錄' || t === 'CTA catalog')
  if (hasCta) {
    throw new Error(`expert still sees CTA catalog nav: ${labels.filter(Boolean).join('|')}`)
  }
  console.log('OK expert sidebar has no CTA catalog')

  await page.goto(`${base}/settings/cta-catalog`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForURL(url => !String(url).includes('/settings/cta-catalog'), { timeout: 15_000 })
  console.log('OK expert CTA route redirected →', page.url())
  await page.close()
}

await browser.close()
console.log(JSON.stringify({ ok: true, count: results.length }, null, 2))
