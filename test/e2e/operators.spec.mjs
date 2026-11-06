/**
 * Operators CRUD e2e（Playwright mock API）。
 * Requires: running `pnpm run dev`.
 *
 * Usage:
 *   PLAYWRIGHT_CHROMIUM_PATH=... node test/e2e/operators.spec.mjs [baseUrl]
 */
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://127.0.0.1:3000'

const now = new Date().toISOString()

/** @type {Array<Record<string, unknown>>} */
let operators = [
  {
    id: 'op-admin-1',
    email: 'admin@candor.local',
    name: '系統管理員',
    roles: ['admin', 'expert'],
    status: 'active',
    last_login_at: now,
    created_at: now,
    updated_at: now
  },
  {
    id: 'op-ops-1',
    email: 'ops@candor.local',
    name: '營運',
    roles: ['ops'],
    status: 'active',
    last_login_at: null,
    created_at: now,
    updated_at: now
  }
]

function sessionFor(role) {
  return {
    token: `operators-mock-${role}`,
    profile: {
      operator: {
        id: role === 'admin' ? 'op-admin-1' : `op-mock-${role}`,
        roles: [role],
        email: `${role}-mock@candor.local`,
        name: `Mock ${role}`,
        status: 'active',
        last_login_at: now
      },
      expiresAt: Date.now() + 86400_000,
      issuedAt: Date.now()
    }
  }
}

async function installOperatorRoutes(page) {
  await page.route('**/api/v1/admin/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: 'op-admin-1',
          email: 'admin-mock@candor.local',
          name: 'Mock admin',
          roles: ['admin'],
          status: 'active',
          last_login_at: now
        }
      })
    })
  })

  await page.route('**/api/v1/admin/operators**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname
    const matchId = path.match(/\/operators\/([^/]+)(?:\/(password))?$/)

    if (method === 'GET' && path.endsWith('/operators')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: { operators } })
      })
      return
    }

    if (method === 'POST' && path.endsWith('/operators')) {
      const body = request.postDataJSON()
      if (!Array.isArray(body.roles) || body.roles.length === 0) {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'roles required',
            error_code: 'invalid_request'
          })
        })
        return
      }
      if (operators.some(row => row.email === body.email)) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'email exists',
            error_code: 'conflict'
          })
        })
        return
      }
      const created = {
        id: `op-${Date.now()}`,
        email: body.email,
        name: body.name,
        roles: body.roles,
        status: 'active',
        last_login_at: null,
        created_at: now,
        updated_at: now
      }
      operators = [...operators, created]
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: created })
      })
      return
    }

    if (matchId && method === 'GET') {
      const id = decodeURIComponent(matchId[1])
      const row = operators.find(item => item.id === id)
      if (!row) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'not found',
            error_code: 'not_found'
          })
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: row })
      })
      return
    }

    if (matchId && method === 'PATCH' && !matchId[2]) {
      const id = decodeURIComponent(matchId[1])
      const body = request.postDataJSON()
      if (id === 'op-admin-1' && Array.isArray(body.roles) && !body.roles.includes('admin')) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'cannot modify self',
            error_code: 'cannot_modify_self'
          })
        })
        return
      }
      if (
        Array.isArray(body.roles)
        && !body.roles.includes('admin')
        && !operators.some(row => row.id !== id && Array.isArray(row.roles) && row.roles.includes('admin'))
      ) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'last admin',
            error_code: 'cannot_remove_last_admin'
          })
        })
        return
      }
      const idx = operators.findIndex(item => item.id === id)
      if (idx < 0) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failed',
            error_message: 'not found',
            error_code: 'not_found'
          })
        })
        return
      }
      const current = operators[idx]
      const updated = {
        ...current,
        name: typeof body.name === 'string' ? body.name : current.name,
        roles: Array.isArray(body.roles) ? body.roles : current.roles,
        status: body.status === 'active' || body.status === 'suspended' ? body.status : current.status,
        updated_at: now
      }
      operators = operators.map((row, i) => (i === idx ? updated : row))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', data: updated })
      })
      return
    }

    if (matchId?.[2] === 'password' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { id: decodeURIComponent(matchId[1]), status: 'password_reset' }
        })
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'failed', error_message: 'unhandled', error_code: 'not_found' })
    })
  })
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})

// ops／expert 不可進帳號管理
const opsPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await opsPage.addInitScript((payload) => {
  localStorage.setItem('candor.operator.token', payload.token)
  localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
}, sessionFor('ops'))
await opsPage.goto(`${base}/operators`, { waitUntil: 'networkidle' })
await opsPage.waitForTimeout(500)
assert.ok(!/\/operators/.test(opsPage.url()) || await opsPage.getByTestId('operators-table').count() === 0)
await opsPage.close()

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.addInitScript((payload) => {
  localStorage.setItem('candor.operator.token', payload.token)
  localStorage.setItem('candor.operator.profile', JSON.stringify(payload.profile))
}, sessionFor('admin'))
await installOperatorRoutes(page)

await page.goto(`${base}/operators`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="operators-table"]', { timeout: 30_000 })
const listText = await page.getByTestId('operators-table').innerText()
assert.ok(/系統管理員/.test(listText), 'missing admin name')
assert.ok(/管理員|Admin/i.test(listText) && /專家|Expert/i.test(listText), 'missing multi-role labels')

await page.getByTestId('operators-create').click()
await page.waitForSelector('[data-testid="operator-form"]', { timeout: 15_000 })

// 前端至少一個角色驗證
await page.getByTestId('operator-form-email').fill('newbie@candor.local')
await page.getByTestId('operator-form-name').fill('新帳號')
await page.getByTestId('operator-form-password').fill('StrongPass1!')
await page.getByTestId('operator-form-save').click()
await page.waitForSelector('[data-testid="operator-form-error"]', { timeout: 5_000 })
assert.ok(
  /至少選擇一個角色|at least one role/i.test(await page.getByTestId('operator-form-error').innerText()),
  'expected roles required validation'
)

// 多角色建立
await page.getByTestId('operator-form-role-ops').check()
await page.getByTestId('operator-form-role-expert').check()
await page.getByTestId('operator-form-save').click()
await page.waitForSelector('[data-testid="operator-form"]', { timeout: 15_000 })
assert.ok(await page.getByTestId('operator-form-role-ops').isChecked())
assert.ok(await page.getByTestId('operator-form-role-expert').isChecked())

// 編輯：觸發 cannot_modify_self 409
await page.goto(`${base}/operators/op-admin-1`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="operator-form"]', { timeout: 15_000 })
await page.getByTestId('operator-form-role-admin').uncheck()
await page.getByTestId('operator-form-save').click()
await page.waitForSelector('[data-testid="operator-form-error"]', { timeout: 10_000 })
const err = await page.getByTestId('operator-form-error').innerText()
assert.ok(
  /不能移除自己最後的 admin|cannot remove your last admin/i.test(err),
  `unexpected 409 copy: ${err}`
)

console.log('operators CRUD e2e ok')
await browser.close()
