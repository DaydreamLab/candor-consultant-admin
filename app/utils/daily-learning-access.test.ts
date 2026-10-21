import { describe, expect, it } from 'vitest'
import {
  canConfirmDailyLearning,
  canDryRunWeightSet,
  canGenerateDailyLearningDraft,
  canPublishWeightSet,
  canReadWeightSets
} from './daily-learning-access'

describe('daily-learning-access', () => {
  it('lets expert and admin generate／dry-run／publish; ops cannot', () => {
    expect(canGenerateDailyLearningDraft('expert')).toBe(true)
    expect(canGenerateDailyLearningDraft('admin')).toBe(true)
    expect(canGenerateDailyLearningDraft('ops')).toBe(false)
    expect(canGenerateDailyLearningDraft(null)).toBe(false)

    expect(canDryRunWeightSet('ops')).toBe(false)
    expect(canDryRunWeightSet('expert')).toBe(true)
    expect(canPublishWeightSet('ops')).toBe(false)
    expect(canPublishWeightSet('admin')).toBe(true)
  })

  it('lets expert／ops／admin confirm and read weight sets', () => {
    expect(canConfirmDailyLearning('ops')).toBe(true)
    expect(canConfirmDailyLearning('expert')).toBe(true)
    expect(canConfirmDailyLearning('admin')).toBe(true)
    expect(canConfirmDailyLearning(null)).toBe(false)

    expect(canReadWeightSets('ops')).toBe(true)
    expect(canReadWeightSets('expert')).toBe(true)
    expect(canReadWeightSets(undefined)).toBe(false)
  })
})
