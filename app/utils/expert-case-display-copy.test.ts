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
    expect(zh.expertCaseReviews.excludedReason.other).toBe('其他')
  })

  it('defines P0 enum label maps and unknown → 其他', () => {
    expect(zh.expertCaseReviews.other).toBe('其他')
    expect(zh.expertCaseReviews.decision.approve).toBe('保留')
    expect(zh.expertCaseReviews.decision.reject).toBe('移除')
    expect(zh.expertCaseReviews.decision.adjust).toBe('調劑量')
    expect(zh.expertCaseReviews.reportResultStatus.completed).toBe('已完成')
    expect(zh.expertCaseReviews.reportResultStatus.ready).toBe('已就緒')
    expect(zh.expertCaseReviews.diet.vegan).toBe('純素')
    expect(zh.expertCaseReviews.condition.pregnancy).toBe('懷孕')
    expect(zh.expertCaseReviews.goal.sleep).toBe('睡眠')
    expect(zh.expertCaseReviews.goalsSourceConversation).toBe('來源：對話（舊案）')
    expect(zh.expertCaseReviews.goalsSourceConversation).not.toContain('fallback')
    expect(zh.expertCaseReviews.profileField.unknown).toBe('其他')
    expect(zh.expertCaseReviews.adjustmentType.unknown).toBe('其他')
    expect(en.expertCaseReviews.decision.adjust.toLowerCase()).toContain('dose')
    expect(en.expertCaseReviews.reportResultStatus.completed.toLowerCase()).toContain('completed')
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

  it('defines missing goals/report soft chip copy (advisory only)', () => {
    expect(zh.expertCaseReviews.missingGoalsChip).toBe('缺目標')
    expect(zh.expertCaseReviews.missingReportChip).toBe('缺報告')
    expect(zh.expertCaseReviews.missingSignalsHint).toContain('不挡')
    expect(zh.expertCaseReviews.missingSignalsHint).toContain('定案')
    expect(en.expertCaseReviews.missingGoalsChip.toLowerCase()).toContain('goals')
    expect(en.expertCaseReviews.missingReportChip.toLowerCase()).toContain('report')
    expect(en.expertCaseReviews.missingSignalsHint.toLowerCase()).toContain('still')
  })

  it('defines capsule dose + empty-copy submit gate copy (UIUX)', () => {
    expect(zh.expertCaseReviews.doseUnit).toBe('顆')
    expect(zh.expertCaseReviews.doseInvalid).toBe('請輸入 ≥1 的整數（顆）')
    expect(zh.expertCaseReviews.doseSuggestionLineWithSpec).toContain('建議：每日 {n} 顆')
    expect(zh.expertCaseReviews.doseSuggestionLineWithSpec).toContain('規格 {spec}')
    expect(zh.expertCaseReviews.doseKeepEditHint).toContain('調劑量')
    expect(zh.expertCaseReviews.submitNeedsCopy).toBe('請先產生或填寫至少一段定稿文案')
    expect(zh.expertCaseReviews.submitDoseBlocked).toContain('劑量')
    expect(en.expertCaseReviews.doseInvalid.toLowerCase()).toContain('integer')
    expect(en.expertCaseReviews.submitNeedsCopy.toLowerCase()).toContain('finalize')
  })
})
