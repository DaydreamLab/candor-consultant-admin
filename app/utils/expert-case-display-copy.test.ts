import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh-TW.json'

describe('expert case display copy', () => {
  it('defines tier plain labels for primary/secondary', () => {
    expect(zh.custom.tierPrimary).toBe('主要推薦')
    expect(zh.custom.tierSecondary).toBe('輔助推薦')
    expect(en.custom.tierPrimary.toLowerCase()).toContain('primary')
    expect(en.custom.tierSecondary.toLowerCase()).toContain('supporting')
  })

  it('defines excluded reason labels including contraindication and other fallback', () => {
    expect(zh.custom.excludedReason.dose_above_ul).toContain('安全上限')
    expect(zh.custom.excludedReason.contraindication).toContain('健康狀況')
    expect(zh.custom.excludedReason.contraindicationWithCondition).toContain('{condition}')
    expect(zh.custom.excludedReason.interaction_exclude).toContain('交互')
    expect(zh.custom.excludedReason.diet_incompatible).toContain('飲食')
    expect(zh.custom.excludedReason.other).toBe('其他')
  })

  it('defines P0 enum label maps and unknown → 其他', () => {
    expect(zh.custom.other).toBe('其他')
    expect(zh.custom.decision.approve).toBe('保留')
    expect(zh.custom.decision.reject).toBe('移除')
    expect(zh.custom.decision.adjust).toBe('調劑量')
    expect(zh.custom.reportResultStatus.completed).toBe('已完成')
    expect(zh.custom.reportResultStatus.ready).toBe('已就緒')
    expect(zh.custom.diet.vegan).toBe('純素')
    expect(zh.custom.condition.pregnancy).toBe('懷孕')
    expect(zh.custom.goal.sleep).toBe('睡眠')
    expect(zh.custom.goalsSourceConversation).toBe('來源：對話（舊案）')
    expect(zh.custom.goalsSourceConversation).not.toContain('fallback')
    expect(zh.custom.profileField.unknown).toBe('其他')
    expect(zh.custom.adjustmentType.unknown).toBe('其他')
    expect(en.custom.decision.adjust.toLowerCase()).toContain('dose')
    expect(en.custom.reportResultStatus.completed.toLowerCase()).toContain('completed')
  })

  it('marks adjustment reason visibility copy for member vs admin-only', () => {
    expect(zh.custom.adjustmentsMemberFacingHint).toContain('會員')
    expect(zh.custom.adjustmentsMemberFacingHint).toContain('推薦原因')
    expect(zh.custom.adjustmentsAdminOnlyHint).toContain('不會顯示給會員')
    expect(zh.custom.adjustmentsAdminOnlyHint).toContain('每日學習')
  })

  it('defines score tooltip and weight-background section keys', () => {
    expect(zh.custom.profileUpdateBanner).toContain('建案後更新')
    expect(zh.custom.scoreTooltip).toContain('同方案內相對分數')
    expect(zh.custom.weightBackgroundTitle).toBe('權重調整背景資訊')
    expect(zh.custom.weightTopDomainsSeverity).toContain('嚴重度')
    expect(en.custom.scoreTooltip.toLowerCase()).toContain('relative score')
  })

  it('defines Wave-2 list filter chips and empty/error copy', () => {
    expect(zh.custom.filterAll).toBe('全部')
    expect(zh.custom.filterAwaiting).toBe('待檢視')
    expect(zh.custom.filterReviewed).toBe('已定稿')
    expect(zh.custom.statusAwaiting).toBe('待專家檢視')
    expect(zh.custom.emptyTitle).toBe('目前沒有案件')
    expect(zh.custom.emptyBody).toContain('引擎建議')
    expect(zh.custom.retry).toBe('重試')
    expect(zh.custom.refresh).toBe('重新整理')
    expect(en.custom.filterAwaiting.toLowerCase()).toContain('pending')
    expect(en.custom.statusAwaiting.toLowerCase()).toContain('expert')
  })

  it('defines missing goals/report soft chip copy (advisory only)', () => {
    expect(zh.custom.missingGoalsChip).toBe('缺目標')
    expect(zh.custom.missingReportChip).toBe('缺報告')
    expect(zh.custom.missingSignalsHint).toContain('不挡')
    expect(zh.custom.missingSignalsHint).toContain('定案')
    expect(en.custom.missingGoalsChip.toLowerCase()).toContain('goals')
    expect(en.custom.missingReportChip.toLowerCase()).toContain('report')
    expect(en.custom.missingSignalsHint.toLowerCase()).toContain('still')
  })

  it('defines capsule dose + empty-copy submit gate copy (UIUX)', () => {
    expect(zh.custom.doseUnit).toBe('顆')
    expect(zh.custom.doseInvalid).toBe('請輸入 ≥1 的整數（顆）')
    expect(zh.custom.doseSuggestionLineWithSpec).toContain('建議：每日 {n} 顆')
    expect(zh.custom.doseSuggestionLineWithSpec).toContain('規格 {spec}')
    expect(zh.custom.doseKeepEditHint).toContain('調劑量')
    expect(zh.custom.submitNeedsCopy).toBe('請先產生或填寫至少一段定稿文案')
    expect(zh.custom.submitDoseBlocked).toContain('劑量')
    expect(en.custom.doseInvalid.toLowerCase()).toContain('integer')
    expect(en.custom.submitNeedsCopy.toLowerCase()).toContain('finalize')
  })
})
