import { describe, expect, it } from 'vitest'

/** Mirrors skip-once behavior used after the user already confirmed cancel navigation. */
function consumeSkipLeaveConfirm(skip: { value: boolean }): boolean {
  if (skip.value) {
    skip.value = false
    return true
  }
  return false
}

describe('usePackagePlanLeaveGuard skip flag', () => {
  it('consumes skip once so a second leave check can prompt again', () => {
    const skip = { value: true }
    expect(consumeSkipLeaveConfirm(skip)).toBe(true)
    expect(skip.value).toBe(false)
    expect(consumeSkipLeaveConfirm(skip)).toBe(false)
  })
})
