import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh-TW.json'

describe('expert case reason copy', () => {
  it('swap/add reasons mention member recommendation and daily learning', () => {
    expect(zh.custom.reasonMemberFacingHint).toContain('會員看到的推薦原因')
    expect(zh.custom.reasonMemberFacingHint).toContain('每日學習')
    expect(zh.custom.reasonRequiredMemberFacing).toContain('會員看到的推薦原因')
    expect(zh.custom.reasonRequiredMemberFacing).toContain('每日學習')

    expect(en.custom.reasonMemberFacingHint.toLowerCase()).toContain('recommendation reason')
    expect(en.custom.reasonMemberFacingHint.toLowerCase()).toContain('daily learning')
    expect(en.custom.reasonRequiredMemberFacing.toLowerCase()).toContain('members')
    expect(en.custom.reasonRequiredMemberFacing.toLowerCase()).toContain('daily learning')
  })

  it('remove/dose reasons mention daily learning and are not member recommendation copy', () => {
    expect(zh.custom.reasonAdminOnlyHint).toContain('每日學習')
    expect(zh.custom.reasonAdminOnlyHint).toContain('不會顯示給會員')
    expect(zh.custom.reasonAdminOnlyHint).not.toContain('推薦原因')
    expect(zh.custom.reasonRequiredAdminOnly).toContain('每日學習')
    expect(zh.custom.reasonRequiredAdminOnly).toContain('不會顯示給會員')
    expect(zh.custom.reasonRequiredAdminOnly).not.toContain('推薦原因')

    expect(en.custom.reasonAdminOnlyHint.toLowerCase()).toContain('daily learning')
    expect(en.custom.reasonAdminOnlyHint.toLowerCase()).toContain('will not see')
    expect(en.custom.reasonAdminOnlyHint.toLowerCase()).not.toContain('recommendation reason')
    expect(en.custom.reasonRequiredAdminOnly.toLowerCase()).toContain('daily learning')
    expect(en.custom.reasonRequiredAdminOnly.toLowerCase()).toContain('will not see')
    expect(en.custom.reasonRequiredAdminOnly.toLowerCase()).not.toContain('recommendation reason')
  })
})
