/**
 * Capture LlmUsageSummary screenshots via a temporary Nuxt fixture page (not committed).
 * Usage: node scripts/capture-llm-usage-screenshots.mjs [baseUrl]
 *
 * Expects a temp page at /dev/llm-usage-fixture (created by the caller for local capture only).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')
const outDir = '/opt/cursor/artifacts'

async function waitForApp(page) {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await page.goto(`${baseUrl}/dev/llm-usage-fixture`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      })
      if (res && (res.ok() || res.status() === 304)) {
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
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,1400']
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } })

  await waitForApp(page)
  await page.locator('[data-testid="fixture-collapsed"]').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('[data-testid="llm-usage-summary"]').first().waitFor({ state: 'visible', timeout: 30000 })

  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="cookie-consent-banner"]').forEach((el) => {
      el.style.display = 'none'
    })
  })

  const collapsedPath = join(outDir, 'llm-usage-collapsed.png')
  const expandedPath = join(outDir, 'llm-usage-expanded-purpose.png')
  const usdOnlyPath = join(outDir, 'llm-usage-usd-only.png')

  await shotElement(page, '[data-testid="fixture-collapsed"]', collapsedPath)
  await shotElement(page, '[data-testid="fixture-expanded"]', expandedPath)
  await shotElement(page, '[data-testid="fixture-usd-only"]', usdOnlyPath)

  await writeFile(
    join(outDir, 'llm-usage-screenshots.json'),
    JSON.stringify({
      baseUrl,
      collapsedPath,
      expandedPath,
      usdOnlyPath,
      at: new Date().toISOString()
    }, null, 2)
  )

  console.log(JSON.stringify({ ok: true, collapsedPath, expandedPath, usdOnlyPath }, null, 2))
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
