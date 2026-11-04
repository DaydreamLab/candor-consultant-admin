/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  caseStatusLabel,
  classificationLabel,
  conditionLabel,
  decisionLabel,
  dietLabel,
  formatConditionsDisplay,
  formatIntakeRows,
  formatIntakeValue,
  goalLabel,
  looksLikeLocalizedText,
  operatorRoleLabel,
  packagePlanCodeLabel,
  reportResultStatusLabel,
  resolveExpertProfileSections,
  shortConversationId,
  sexLabel
} from './expert-case-labels'
import {
  expertCaseMemberDataFixture,
  expertCaseMemberDataFixtureWithoutDisplayProfile
} from './expert-case-member-data-fixtures'
import { parseDisplayProfile } from './expert-case-display'

const messages: Record<string, string> = {
  'custom.other': '其他',
  'custom.unnamed': '未命名',
  'custom.yes': '是',
  'custom.no': '否',
  'custom.intakeEmpty': '—',
  'custom.intakeNone': '無',
  'custom.decision.approve': '保留',
  'custom.decision.reject': '移除',
  'custom.decision.adjust': '調劑量',
  'custom.reportResultStatus.completed': '已完成',
  'custom.reportResultStatus.ready': '已就緒',
  'custom.reportResultStatus.pending': '處理中',
  'custom.reportResultStatus.processing': '處理中',
  'custom.reportResultStatus.failed': '失敗',
  'custom.diet.vegan': '純素',
  'custom.diet.omnivore': '雜食',
  'custom.condition.pregnancy': '懷孕',
  'custom.condition.kidney_disease': '腎臟疾病',
  'custom.goal.sleep': '睡眠',
  'custom.goal.energy': '能量',
  'custom.classification.reusable': '通則（可沿用）',
  'custom.classification.personal_risk': '個案（個人風險）',
  'custom.statusAwaiting': '待專家檢視',
  'custom.statusReviewed': '已定稿',
  'custom.sexMale': '男',
  'custom.sexFemale': '女',
  'custom.intake.meals_per_day': '每日餐數',
  'custom.intake.notes': '備註',
  'custom.intake.value': '內容',
  'custom.intake.allergies': '過敏',
  'custom.intake.medications': '用藥',
  'custom.intake.diseases': '疾病',
  'custom.intake.symptoms': '症狀',
  'custom.intake.other_status': '其他健康狀況',
  'custom.intake.incidents': '特殊事件',
  'custom.intake.lab_report': '檢驗報告',
  'custom.intake.checkup': '健檢',
  'custom.intake.blood_test': '抽血檢驗',
  'custom.intake.exercise_habit': '運動習慣',
  'custom.intake.exercise_detail': '運動細節',
  'custom.intake.supplement_habit': '保健品習慣',
  'custom.intake.supplement_detail': '保健品細節',
  'custom.intake.has': '有無',
  'custom.intake.detail': '細節',
  'custom.profileField.sex': '生理性別',
  'custom.profileField.age_years': '年齡（歲）',
  'custom.profileField.height_cm': '身高（公分）',
  'custom.profileField.weight_kg': '體重（公斤）',
  'custom.profileField.diet': '飲食型態',
  'custom.profileField.goals': '目標',
  'custom.profileField.conditions': '健康狀況',
  'custom.profileField.intake': '攝取與問卷細節',
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
    expect(rows.map(row => row.label)).toEqual(['每日餐數', '細節', '備註'])
    expect(rows.find(row => row.key === 'mystery_key')?.title).toBe('mystery_key')
    expect(rows.find(row => row.key === 'notes')?.value).toBe('少油')
    expect(rows.every(row => !row.value.includes('{'))).toBe(true)
  })

  it('hides answered meta, maps bool／{has:false}／none, and does not flood 其他', () => {
    const rows = formatIntakeRows({
      answered: {
        過敏: true,
        blood_test: true,
        diseases: true,
        symptoms: true
      },
      allergies: { has: false },
      medications: { has: false },
      diseases: ['偏頭痛'],
      symptoms: ['容易疲勞'],
      other_status: 'none',
      lab_report: { has: false },
      exercise_habit: true,
      supplement_habit: false
    }, t)

    expect(rows.some(row => row.key === 'answered')).toBe(false)
    expect(rows.some(row => row.key === 'diseases')).toBe(false)
    expect(rows.some(row => row.key === 'symptoms')).toBe(false)
    expect(rows.map(row => row.label).every(label => label !== '其他')).toBe(true)

    expect(rows.find(row => row.key === 'allergies')?.value).toBe('無')
    expect(rows.find(row => row.key === 'lab_report')?.value).toBe('無')
    expect(rows.find(row => row.key === 'other_status')?.value).toBe('無')
    expect(rows.find(row => row.key === 'exercise_habit')?.value).toBe('是')
    expect(rows.find(row => row.key === 'supplement_habit')?.value).toBe('否')
    expect(rows.every(row => !/\btrue\b|\bfalse\b/.test(row.value))).toBe(true)
  })

  it('folds diseases／symptoms into健康狀況 when conditions is empty', () => {
    const display = formatConditionsDisplay([], {
      diseases: ['偏頭痛'],
      symptoms: ['容易疲勞', '入睡困難']
    }, t)
    expect(display.text).toContain('疾病：偏頭痛')
    expect(display.text).toContain('症狀：容易疲勞、入睡困難')
  })

  it('formatIntakeValue never returns literal true/false', () => {
    expect(formatIntakeValue(true, t)).toBe('是')
    expect(formatIntakeValue(false, t)).toBe('否')
    expect(formatIntakeValue({ has: false }, t)).toBe('無')
    expect(formatIntakeValue('none', t)).toBe('無')
  })

  it('prefers profile.display_profile sections when present', () => {
    const fixture = expertCaseMemberDataFixture()
    const sections = resolveExpertProfileSections(fixture.profile, t)
    expect(sections.map(section => section.id)).toEqual([
      'basics',
      'goals',
      'conditions',
      'intake'
    ])
    const conditions = sections.find(section => section.id === 'conditions')
    expect(conditions?.rows[0]?.value).toContain('偏頭痛')
    expect(conditions?.rows[0]?.value).not.toBe('—')
    const intake = sections.find(section => section.id === 'intake')
    expect(intake?.rows.every(row => row.label !== '其他')).toBe(true)
    expect(intake?.rows.every(row => !/\btrue\b|\bfalse\b/.test(row.value))).toBe(true)
  })

  it('falls back to snapshot flatten with健康狀況 content when display_profile missing', () => {
    const fixture = expertCaseMemberDataFixtureWithoutDisplayProfile()
    const sections = resolveExpertProfileSections(fixture.profile, t)
    const conditions = sections.find(section => section.id === 'conditions')
    expect(conditions?.rows[0]?.value).toContain('疾病')
    expect(conditions?.rows[0]?.value).toContain('偏頭痛')
    const intake = sections.find(section => section.id === 'intake')
    expect(intake?.rows.some(row => row.key === 'answered')).toBe(false)
    expect(intake?.rows.every(row => row.label !== '其他')).toBe(true)
  })

  it('parses display_profile contract shape', () => {
    const parsed = parseDisplayProfile(expertCaseMemberDataFixture().profile?.display_profile)
    expect(parsed?.sections.length).toBeGreaterThan(0)
    expect(parsed?.sections[0]?.title_zh).toBeTruthy()
    expect(parsed?.sections[0]?.rows[0]?.label_zh).toBeTruthy()
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
