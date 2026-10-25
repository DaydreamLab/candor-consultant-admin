/**
 * Capture /settings privacy UI screenshots (requires NUXT_PUBLIC_PRIVACY_POLICY_MOCK=1).
 * Usage: node scripts/capture-privacy-settings-screenshots.mjs [baseUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')
const outDir = '/opt/cursor/artifacts'

async function waitForApp(page) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 10000 })
      if (res && res.ok()) {
        return
      }
    } catch {
      // retry
    }
    await page.waitForTimeout(1000)
  }
  throw new Error(`App not ready at ${baseUrl}`)
}

async function shotElement(page, selector, filePath) {
  const el = page.locator(selector).first()
  await el.waitFor({ state: 'visible', timeout: 30000 })
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await el.screenshot({ path: filePath })
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,1200']
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })

  await waitForApp(page)

  await page.locator('[data-testid="settings-privacy"]').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('[data-testid="privacy-policy-title"]').waitFor({ state: 'visible', timeout: 30000 })

  // Dismiss cookie banner (may appear after public GET); also force-hide as fallback.
  for (let i = 0; i < 10; i += 1) {
    const accept = page.locator('[data-testid="cookie-consent-accept"]')
    if (await accept.count()) {
      await accept.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(300)
      break
    }
    await page.waitForTimeout(300)
  }
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="cookie-consent-banner"]').forEach((el) => {
      el.style.display = 'none'
    })
  })

  const editorPath = join(outDir, 'settings-privacy-editor.png')
  // Capture title/body/version/save — exclude the diff block for a clean editor shot.
  await page.evaluate(() => {
    const diff = document.querySelector('[data-testid="settings-privacy-diff"]')
    if (diff) {
      diff.setAttribute('data-shot-hidden', '1')
      diff.style.display = 'none'
    }
  })
  await page.locator('[data-testid="privacy-policy-editor-split"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('[data-testid="privacy-policy-live-preview"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('[data-testid="privacy-policy-save"]').waitFor({ state: 'visible', timeout: 15000 })
  await shotElement(page, '[data-testid="settings-privacy"]', editorPath)
  await page.evaluate(() => {
    const diff = document.querySelector('[data-testid="settings-privacy-diff"]')
    if (diff && diff.getAttribute('data-shot-hidden') === '1') {
      diff.style.display = ''
      diff.removeAttribute('data-shot-hidden')
    }
  })

  await page.locator('[data-testid="privacy-policy-diff"]').waitFor({ state: 'visible', timeout: 30000 })
  const diffPath = join(outDir, 'settings-privacy-side-by-side-diff.png')
  await shotElement(page, '[data-testid="settings-privacy-diff"]', diffPath)

  await writeFile(
    join(outDir, 'settings-privacy-screenshots.json'),
    JSON.stringify({ baseUrl, editorPath, diffPath, at: new Date().toISOString() }, null, 2)
  )

  console.log(JSON.stringify({ ok: true, editorPath, diffPath }, null, 2))
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
