import { describe, expect, it } from 'vitest'
import {
  caseStatusLabel,
  classificationLabel,
  conditionLabel,
  decisionLabel,
  dietLabel,
  formatIntakeRows,
  goalLabel,
  looksLikeLocalizedText,
  operatorRoleLabel,
  packagePlanCodeLabel,
  reportResultStatusLabel,
  shortConversationId,
  sexLabel
} from './expert-case-labels'

const messages: Record<string, string> = {
  'expertCaseReviews.other': '其他',
  'expertCaseReviews.unnamed': '未命名',
  'expertCaseReviews.decision.approve': '保留',
  'expertCaseReviews.decision.reject': '移除',
  'expertCaseReviews.decision.adjust': '調劑量',
  'expertCaseReviews.reportResultStatus.completed': '已完成',
  'expertCaseReviews.reportResultStatus.ready': '已就緒',
  'expertCaseReviews.reportResultStatus.pending': '處理中',
  'expertCaseReviews.reportResultStatus.processing': '處理中',
  'expertCaseReviews.reportResultStatus.failed': '失敗',
  'expertCaseReviews.diet.vegan': '純素',
  'expertCaseReviews.diet.omnivore': '雜食',
  'expertCaseReviews.condition.pregnancy': '懷孕',
  'expertCaseReviews.condition.kidney_disease': '腎臟疾病',
  'expertCaseReviews.goal.sleep': '睡眠',
  'expertCaseReviews.goal.energy': '能量',
  'expertCaseReviews.classification.reusable': '通則（可沿用）',
  'expertCaseReviews.classification.personal_risk': '個案（個人風險）',
  'expertCaseReviews.statusAwaiting': '待專家檢視',
  'expertCaseReviews.statusReviewed': '已定稿',
  'expertCaseReviews.sexMale': '男',
  'expertCaseReviews.sexFemale': '女',
  'expertCaseReviews.intake.meals_per_day': '每日餐數',
  'expertCaseReviews.intake.notes': '備註',
  'expertCaseReviews.intake.value': '內容',
  'roles.admin': '管理員',
  'roles.expert': '專家',
  'roles.ops': '營運',
  'plan.basic': '一般解讀',
  'plan.mid': '協助採檢',
  'plan.premium': '個人化選品'
}

function t(key: string) {
  return messages[key] ?? key
}

describe('expert-case-labels', () => {
  it('maps decision / operator role / report status; unknown → 其他 + title', () => {
    expect(decisionLabel('approve', t)).toEqual({ text: '保留', title: null, known: true })
    expect(decisionLabel('adjust', t)?.text).toBe('調劑量')
    expect(decisionLabel('mystery', t)).toEqual({ text: '其他', title: 'mystery', known: false })

    expect(operatorRoleLabel('admin', t)?.text).toBe('管理員')
    expect(operatorRoleLabel('ghost', t)).toEqual({ text: '其他', title: 'ghost', known: false })

    expect(reportResultStatusLabel('completed', t).text).toBe('已完成')
    expect(reportResultStatusLabel('ready', t).text).toBe('已就緒')
    expect(reportResultStatusLabel('pending', t).text).toBe('處理中')
    expect(reportResultStatusLabel('weird', t)).toEqual({ text: '其他', title: 'weird', known: false })
  })

  it('maps diet / condition / goal; keeps Chinese free text; unknown → 其他', () => {
    expect(dietLabel('vegan', t).text).toBe('純素')
    expect(dietLabel('彈性素食者', t)).toEqual({ text: '彈性素食者', title: null, known: true })
    expect(dietLabel('carnivore', t)).toEqual({ text: '其他', title: 'carnivore', known: false })

    expect(conditionLabel('pregnancy', t).text).toBe('懷孕')
    expect(conditionLabel('kidney_disease', t).text).toBe('腎臟疾病')
    expect(conditionLabel('asthma', t).title).toBe('asthma')

    expect(goalLabel('sleep', t).text).toBe('睡眠')
    expect(goalLabel('改善睡眠品質', t).text).toBe('改善睡眠品質')
    expect(goalLabel('mystery_goal', t).text).toBe('其他')
  })

  it('prefers package plan name; falls back to plan.* then 其他', () => {
    expect(packagePlanCodeLabel('basic', '個人化方案名', t).text).toBe('個人化方案名')
    expect(packagePlanCodeLabel('basic', null, t).text).toBe('一般解讀')
    expect(packagePlanCodeLabel('enterprise', null, t)).toEqual({
      text: '其他',
      title: 'enterprise',
      known: false
    })
  })

  it('formats intake as structured rows without dumping the whole object as JSON', () => {
    const rows = formatIntakeRows({
      meals_per_day: 3,
      mystery_key: 'x',
      notes: '少油'
    }, t)
    expect(rows.map(row => row.label)).toEqual(['每日餐數', '其他', '備註'])
    expect(rows.find(row => row.key === 'mystery_key')?.title).toBe('mystery_key')
    expect(rows.find(row => row.key === 'notes')?.value).toBe('少油')
    expect(rows.every(row => !row.value.includes('{'))).toBe(true)
  })

  it('maps case status / sex / classification and shortens conversation id', () => {
    expect(caseStatusLabel('awaiting_review', t).text).toBe('待專家檢視')
    expect(caseStatusLabel('reviewed', t).text).toBe('已定稿')
    expect(caseStatusLabel('archived', t)).toEqual({ text: '其他', title: 'archived', known: false })

    expect(sexLabel('M', t).text).toBe('男')
    expect(sexLabel('X', t).text).toBe('其他')

    expect(classificationLabel('reusable', t).text).toContain('通則')
    expect(shortConversationId('abcdef12-3456-7890')).toBe('abcdef12…')
    expect(looksLikeLocalizedText('純素')).toBe(true)
    expect(looksLikeLocalizedText('vegan')).toBe(false)
  })
})
