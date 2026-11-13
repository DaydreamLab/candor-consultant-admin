/**
 * Read-only chat CTA (design B v3) on expert station + member detail.
 * Requires: `NUXT_PUBLIC_EXPERT_BOOKING_MOCK=1` and `pnpm run dev`.
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/chat-cta-readonly.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const base = process.argv[2] || 'http://localhost:3000'
const shotDir = '/opt/cursor/artifacts'

const expertSession = {
  token: 'expert-station-mock-token',
  profile: {
    operator: {
      id: 'op-expert-wang',
      roles: ['expert'],
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

await mkdir(shotDir, { recursive: true })

const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
await page.addInitScript((payload) => {
  localStorage.setItem('candor.operator.token', payload.token)
  localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
}, expertSession)

await page.goto(`${base}/expert/bookings/eb-await-1`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="expert-station-conversation"]', { timeout: 30_000 })
await page.waitForSelector('[data-testid="chat-cta-chip-plan"]', { timeout: 30_000 })

assert.equal(await page.locator('[data-testid="chat-cta-chip-plan"]').getAttribute('data-status'), 'selected')
assert.equal(await page.locator('[data-testid="chat-cta-chip-chat"]').getAttribute('data-status'), 'disabled')
assert.equal(await page.locator('[data-testid="chat-cta-confirm"]').getAttribute('data-status'), 'selected')
assert.equal(await page.locator('[data-testid="chat-cta-vitals"]').getAttribute('data-status'), 'selected')
assert.equal(await page.locator('[data-testid="chat-cta-vitals"]').getAttribute('data-has-stored-value'), '1')
assert.match(await page.locator('[data-testid="chat-cta-vitals"]').textContent() || '', /36/)
assert.equal(await page.locator('[data-testid="chat-reply-actions-readonly"] button').count(), 0)
await page.waitForSelector('[data-testid="chat-cta-whole-ask_report"]', { timeout: 30_000 })
assert.equal((await page.locator('[data-testid="chat-cta-whole-ask_report"]').textContent() || '').trim(), '上傳報告')
assert.equal((await page.locator('[data-testid="chat-cta-whole-offer_checkup"]').textContent() || '').trim(), '我想做檢查，確認各項指標')

await page.locator('[data-testid="expert-station-conversation"]').screenshot({
  path: join(shotDir, 'cta-readonly-selected.png')
})
await page.locator('[data-testid="chat-cta-whole-ask_report"]').screenshot({
  path: join(shotDir, 'cta-readonly-expert-ask-report-after.png')
})
await page.locator('[data-testid="chat-cta-whole-offer_checkup"]').screenshot({
  path: join(shotDir, 'cta-readonly-expert-offer-checkup-after.png')
})

await page.goto(`${base}/expert/bookings/eb-sched-1`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="chat-cta-vitals"]', { timeout: 30_000 })
assert.equal(await page.locator('[data-testid="chat-cta-chip-plan"]').getAttribute('data-status'), 'disabled')
const vitalsCards = page.locator('[data-testid="chat-cta-vitals"]')
assert.equal(await vitalsCards.count(), 2)
assert.equal(await vitalsCards.nth(0).getAttribute('data-has-stored-value'), '1')
assert.match(await vitalsCards.nth(0).textContent() || '', /36/)
assert.equal(await vitalsCards.nth(1).getAttribute('data-has-stored-value'), '0')
assert.equal((await vitalsCards.nth(1).textContent() || '').trim(), '')

await page.locator('[data-testid="expert-station-conversation"]').screenshot({
  path: join(shotDir, 'cta-readonly-grey.png')
})
await vitalsCards.nth(0).screenshot({
  path: join(shotDir, 'cta-readonly-vitals-stored.png')
})
await vitalsCards.nth(1).screenshot({
  path: join(shotDir, 'cta-readonly-vitals-unstored.png')
})

const adminPage = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
await adminPage.addInitScript(() => {
  localStorage.setItem('candor.operator.token', 'admin-cta-mock-token')
  localStorage.setItem('candor.operator.profile', JSON.stringify({
    operator: {
      id: 'op-admin-1',
      roles: ['admin'],
      email: 'admin-mock@candor.local',
      name: '管理員',
      status: 'active',
      last_login_at: new Date().toISOString()
    },
    expiresAt: Date.now() + 86400_000,
    issuedAt: Date.now()
  }))
})

await adminPage.route('**/api/v1/admin/me', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'success',
      data: {
        id: 'op-admin-1',
        email: 'admin-mock@candor.local',
        name: '管理員',
        roles: ['admin'],
        status: 'active',
        last_login_at: new Date().toISOString()
      }
    })
  })
})

await adminPage.route('**/api/v1/admin/**', async (route) => {
  const url = route.request().url()
  if (url.includes('/admin/me')) {
    await route.continue()
    return
  }
  if (url.includes('/users/user-cta-1/conversation/') && url.includes('/messages')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          messages: [
            {
              id: 'a1',
              role: 'assistant',
              content: '你想先從哪裡開始？',
              created_at: '2026-03-28T08:00:00.000Z',
              reply_actions: {
                interaction: { round_status: 'historical', outcome: 'option_selected' },
                actions: [{
                  type: 'choose_option',
                  payload: {
                    options: [
                      { code: 'chat', label: '我想聊聊', status: 'disabled' },
                      { code: 'plan', label: '我想諮詢健康方案', status: 'selected' },
                      { code: 'report', label: '幫我看報告', status: 'disabled' }
                    ]
                  }
                }]
              }
            },
            {
              id: 'a1u',
              role: 'user',
              content: '我想諮詢健康方案',
              created_at: '2026-03-28T08:00:30.000Z'
            },
            {
              id: 'a2',
              role: 'assistant',
              content: '請問你的年紀是？',
              created_at: '2026-03-28T08:01:00.000Z',
              reply_actions: {
                interaction: { round_status: 'historical', outcome: 'option_selected' },
                actions: [{
                  type: 'ask_vitals',
                  payload: {
                    fields: ['age'],
                    status: 'selected',
                    has_stored_value: true,
                    stored_value: 36
                  }
                }]
              }
            },
            {
              id: 'a2u',
              role: 'user',
              content: '36',
              created_at: '2026-03-28T08:01:30.000Z'
            },
            {
              id: 'a3',
              role: 'assistant',
              content: '若想確認是否缺維生素 D，最準確的方式是抽血檢測。有報告可上傳一起看；還沒檢查也可討論是否安排。',
              created_at: '2026-03-28T08:02:00.000Z',
              reply_actions: {
                interaction: { round_status: 'historical', outcome: null },
                actions: [
                  { type: 'ask_report', payload: { status: 'disabled' } },
                  { type: 'offer_checkup', payload: { status: 'disabled', url: 'https://example.com/checkup' } }
                ]
              }
            }
          ]
        }
      })
    })
    return
  }
  if (url.includes('/users/user-cta-1/conversations')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          conversations: [{
            id: 'conv-cta-1',
            goals: ['sleep', 'gastrointestinal'],
            created_at: '2026-03-28T08:00:00.000Z',
            updated_at: '2026-03-28T09:00:00.000Z'
          }]
        }
      })
    })
    return
  }
  if (/\/users\/user-cta-1(?:\?|$)/.test(url)) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: 'user-cta-1',
          email: 'lin@example.com',
          display_name: '林小安',
          role: 'member',
          created_at: '2026-01-01T00:00:00.000Z',
          order_count: 1,
          report_count: 0,
          anonymized_at: null
        }
      })
    })
    return
  }
  if (url.includes('/users/user-cta-1/')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data: { orders: [], reports: [], items: [] } })
    })
    return
  }
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'success', data: {} })
  })
})

await adminPage.goto(`${base}/users/user-cta-1`, { waitUntil: 'networkidle' })
await adminPage.waitForSelector('text=conv-cta', { timeout: 30_000 })
const goalsCell = adminPage.locator('tr', { hasText: 'conv-cta' })
const goalsText = (await goalsCell.textContent() || '')
assert.ok(goalsText.includes('睡眠'), `expected Chinese sleep label, got: ${goalsText}`)
assert.ok(goalsText.includes('腸胃道'), `expected Chinese gastrointestinal label, got: ${goalsText}`)
assert.ok(!goalsText.includes('gastrointestinal'), `raw gastrointestinal code should not show: ${goalsText}`)
await goalsCell.click()
await adminPage.waitForSelector('[data-testid="user-conversation-messages"]', { timeout: 30_000 })
await adminPage.waitForSelector('[data-testid="chat-cta-chip-plan"]', { timeout: 30_000 })
assert.equal(await adminPage.locator('[data-testid="chat-cta-chip-plan"]').getAttribute('data-status'), 'selected')
assert.equal(await adminPage.locator('[data-testid="chat-cta-vitals"]').getAttribute('data-has-stored-value'), '1')
await adminPage.waitForSelector('[data-testid="chat-cta-whole-ask_report"]', { timeout: 30_000 })
const askReportText = (await adminPage.locator('[data-testid="chat-cta-whole-ask_report"]').textContent() || '').trim()
const offerCheckupText = (await adminPage.locator('[data-testid="chat-cta-whole-offer_checkup"]').textContent() || '').trim()
assert.equal(askReportText, '上傳報告')
assert.equal(offerCheckupText, '我想做檢查，確認各項指標')
assert.notEqual(askReportText, 'ask_report')
assert.notEqual(offerCheckupText, 'offer_checkup')
await adminPage.locator('[data-testid="user-conversation-messages"]').screenshot({
  path: join(shotDir, 'cta-readonly-admin-selected.png')
})
await adminPage.locator('[data-testid="chat-cta-whole-ask_report"]').screenshot({
  path: join(shotDir, 'cta-readonly-admin-ask-report-after.png')
})
await adminPage.locator('[data-testid="chat-cta-whole-offer_checkup"]').screenshot({
  path: join(shotDir, 'cta-readonly-admin-offer-checkup-after.png')
})

console.log('chat-cta-readonly e2e ok')
await browser.close()
