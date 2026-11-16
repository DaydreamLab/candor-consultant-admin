import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const zh = JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales/zh-TW.json'), 'utf8'))
const en = JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales/en.json'), 'utf8'))

describe('paymentTest i18n copy', () => {
  it('provides localized scopeNote and sandbox key hint', () => {
    expect(zh.paymentTest.scopeNote).toMatch(/不涵蓋會員前台結帳/)
    expect(en.paymentTest.scopeNote).toMatch(/does not exercise the member front-end checkout/)
    expect(zh.paymentTest.sandboxKeyHint).toMatch(/NEWEBPAY_\*/)
    expect(en.paymentTest.sandboxKeyHint).toMatch(/NEWEBPAY_\*\/EZPAY_\*/)
    expect(zh.paymentTest.columns.operator).toBe('operator')
    expect(en.paymentTest.columns.environment).toBe('Environment')
  })
})
