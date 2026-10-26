import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh-TW.json'

describe('expert case display copy', () => {
  it('defines tier plain labels for primary/secondary', () => {
    expect(zh.expertCaseReviews.tierPrimary).toBe('主要推薦')
    expect(zh.expertCaseReviews.tierSecondary).toBe('輔助推薦')
    expect(en.expertCaseReviews.tierPrimary.toLowerCase()).toContain('primary')
    expect(en.expertCaseReviews.tierSecondary.toLowerCase()).toContain('supporting')
  })

  it('defines excluded reason labels including contraindication and other fallback', () => {
    expect(zh.expertCaseReviews.excludedReason.dose_above_ul).toContain('安全上限')
    expect(zh.expertCaseReviews.excludedReason.contraindication).toContain('健康狀況')
    expect(zh.expertCaseReviews.excludedReason.contraindicationWithCondition).toContain('{condition}')
    expect(zh.expertCaseReviews.excludedReason.interaction_exclude).toContain('交互')
    expect(zh.expertCaseReviews.excludedReason.diet_incompatible).toContain('飲食')
    expect(zh.expertCaseReviews.excludedReason.other).toContain('{code}')
  })

  it('marks adjustment reason visibility copy for member vs admin-only', () => {
    expect(zh.expertCaseReviews.adjustmentsMemberFacingHint).toContain('會員')
    expect(zh.expertCaseReviews.adjustmentsMemberFacingHint).toContain('推薦原因')
    expect(zh.expertCaseReviews.adjustmentsAdminOnlyHint).toContain('不會顯示給會員')
    expect(zh.expertCaseReviews.adjustmentsAdminOnlyHint).toContain('每日學習')
  })

  it('defines score tooltip and weight-background section keys', () => {
    expect(zh.expertCaseReviews.profileUpdateBanner).toContain('建案後更新')
    expect(zh.expertCaseReviews.scoreTooltip).toContain('同方案內相對分數')
    expect(zh.expertCaseReviews.weightBackgroundTitle).toBe('權重調整背景資訊')
    expect(zh.expertCaseReviews.weightTopDomainsSeverity).toContain('嚴重度')
    expect(en.expertCaseReviews.scoreTooltip.toLowerCase()).toContain('relative score')
  })

  it('defines Wave-2 list filter chips and empty/error copy', () => {
    expect(zh.expertCaseReviews.filterAll).toBe('全部')
    expect(zh.expertCaseReviews.filterAwaiting).toBe('待檢視')
    expect(zh.expertCaseReviews.filterReviewed).toBe('已定稿')
    expect(zh.expertCaseReviews.statusAwaiting).toBe('待專家檢視')
    expect(zh.expertCaseReviews.emptyTitle).toBe('目前沒有案件')
    expect(zh.expertCaseReviews.emptyBody).toContain('引擎建議')
    expect(zh.expertCaseReviews.retry).toBe('重試')
    expect(zh.expertCaseReviews.refresh).toBe('重新整理')
    expect(en.expertCaseReviews.filterAwaiting.toLowerCase()).toContain('pending')
    expect(en.expertCaseReviews.statusAwaiting.toLowerCase()).toContain('expert')
  })
})
