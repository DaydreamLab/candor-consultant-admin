import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh-TW.json'

describe('expert case reason copy', () => {
  it('swap/add reasons mention member recommendation and daily learning', () => {
    expect(zh.expertCaseReviews.reasonMemberFacingHint).toContain('會員看到的推薦原因')
    expect(zh.expertCaseReviews.reasonMemberFacingHint).toContain('每日學習')
    expect(zh.expertCaseReviews.reasonRequiredMemberFacing).toContain('會員看到的推薦原因')
    expect(zh.expertCaseReviews.reasonRequiredMemberFacing).toContain('每日學習')

    expect(en.expertCaseReviews.reasonMemberFacingHint.toLowerCase()).toContain('recommendation reason')
    expect(en.expertCaseReviews.reasonMemberFacingHint.toLowerCase()).toContain('daily learning')
    expect(en.expertCaseReviews.reasonRequiredMemberFacing.toLowerCase()).toContain('members')
    expect(en.expertCaseReviews.reasonRequiredMemberFacing.toLowerCase()).toContain('daily learning')
  })

  it('remove/dose reasons mention daily learning and are not member recommendation copy', () => {
    expect(zh.expertCaseReviews.reasonAdminOnlyHint).toContain('每日學習')
    expect(zh.expertCaseReviews.reasonAdminOnlyHint).toContain('不會顯示給會員')
    expect(zh.expertCaseReviews.reasonAdminOnlyHint).not.toContain('推薦原因')
    expect(zh.expertCaseReviews.reasonRequiredAdminOnly).toContain('每日學習')
    expect(zh.expertCaseReviews.reasonRequiredAdminOnly).toContain('不會顯示給會員')
    expect(zh.expertCaseReviews.reasonRequiredAdminOnly).not.toContain('推薦原因')

    expect(en.expertCaseReviews.reasonAdminOnlyHint.toLowerCase()).toContain('daily learning')
    expect(en.expertCaseReviews.reasonAdminOnlyHint.toLowerCase()).toContain('will not see')
    expect(en.expertCaseReviews.reasonAdminOnlyHint.toLowerCase()).not.toContain('recommendation reason')
    expect(en.expertCaseReviews.reasonRequiredAdminOnly.toLowerCase()).toContain('daily learning')
    expect(en.expertCaseReviews.reasonRequiredAdminOnly.toLowerCase()).toContain('will not see')
    expect(en.expertCaseReviews.reasonRequiredAdminOnly.toLowerCase()).not.toContain('recommendation reason')
  })
})
