import { describe, expect, it } from 'vitest'
import {
  CONSULTATION_GOAL_I18N_PREFIX,
  consultationGoalLabel,
  formatConsultationGoals
} from './consultation-goal-labels'

/** Mirrors candor-core ConsultationGoal::defaultCatalog() zh labels. */
const CATALOG: Record<string, string> = {
  sleep: '睡眠',
  weight_loss: '減重',
  immune_boost: '免疫提升',
  cognitive_function: '認知功能',
  gastrointestinal: '腸胃道'
}

function t(key: string): string {
  const prefix = `${CONSULTATION_GOAL_I18N_PREFIX}.`
  if (key.startsWith(prefix)) {
    const code = key.slice(prefix.length)
    return CATALOG[code] ?? key
  }
  return key
}

describe('consultationGoalLabel', () => {
  it('maps core catalog codes to Chinese labels', () => {
    expect(consultationGoalLabel('sleep', t)).toBe('睡眠')
    expect(consultationGoalLabel('gastrointestinal', t)).toBe('腸胃道')
    expect(consultationGoalLabel('weight_loss', t)).toBe('減重')
    expect(consultationGoalLabel('immune_boost', t)).toBe('免疫提升')
    expect(consultationGoalLabel('cognitive_function', t)).toBe('認知功能')
  })

  it('falls back to the raw value for unknown codes', () => {
    expect(consultationGoalLabel('mystery_goal', t)).toBe('mystery_goal')
    expect(consultationGoalLabel('sleep_quality', t)).toBe('sleep_quality')
  })

  it('trims and ignores empty', () => {
    expect(consultationGoalLabel('  sleep  ', t)).toBe('睡眠')
    expect(consultationGoalLabel('', t)).toBe('')
    expect(consultationGoalLabel(null, t)).toBe('')
  })
})

describe('formatConsultationGoals', () => {
  it('joins localized labels for list display', () => {
    expect(formatConsultationGoals(['sleep', 'gastrointestinal'], t, '—')).toBe('睡眠, 腸胃道')
  })

  it('returns empty placeholder when missing', () => {
    expect(formatConsultationGoals(undefined, t, '—')).toBe('—')
    expect(formatConsultationGoals([], t, '—')).toBe('—')
    expect(formatConsultationGoals(null, t, '—')).toBe('—')
  })

  it('keeps unknown codes as-is in the join', () => {
    expect(formatConsultationGoals(['sleep', 'weird'], t, '—')).toBe('睡眠, weird')
  })
})
