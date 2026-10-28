import { describe, expect, it } from 'vitest'
import {
  expertCaseHasGoals,
  expertCaseHasHealthReport,
  expertCaseMissingSignals
} from './expert-case-missing-signals'

describe('expert-case-missing-signals', () => {
  it('detects goals from non-empty string array', () => {
    expect(expertCaseHasGoals({ goals: ['sleep', 'energy'] })).toBe(true)
    expect(expertCaseHasGoals({ goals: ['  '] })).toBe(false)
    expect(expertCaseHasGoals({ goals: [] })).toBe(false)
    expect(expertCaseHasGoals({ goals: null })).toBe(false)
    expect(expertCaseHasGoals({})).toBe(false)
    expect(expertCaseHasGoals(null)).toBe(false)
  })

  it('detects health_report object (null / missing = absent)', () => {
    expect(expertCaseHasHealthReport({ health_report: { status: 'ready' } })).toBe(true)
    expect(expertCaseHasHealthReport({ health_report: null })).toBe(false)
    expect(expertCaseHasHealthReport({})).toBe(false)
    expect(expertCaseHasHealthReport(null)).toBe(false)
  })

  it('returns null when member-data not loaded; otherwise soft missing flags', () => {
    expect(expertCaseMissingSignals(null)).toBeNull()
    expect(expertCaseMissingSignals(undefined)).toBeNull()

    expect(expertCaseMissingSignals({
      goals: ['sleep'],
      health_report: { status: 'ready' }
    })).toEqual({ missingGoals: false, missingReport: false })

    expect(expertCaseMissingSignals({
      goals: [],
      health_report: null
    })).toEqual({ missingGoals: true, missingReport: true })

    // Fixture shape: goals present, report null → only missing report
    expect(expertCaseMissingSignals({
      goals: ['sleep', 'energy'],
      health_report: null
    })).toEqual({ missingGoals: false, missingReport: true })
  })
})
