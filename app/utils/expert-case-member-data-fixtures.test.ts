/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import {
  expertCaseMemberDataFixture,
  expertCaseMemberDataFixtureWithoutDisplayProfile
} from './expert-case-member-data-fixtures'
import { parseDisplayProfile, isRecord } from './expert-case-display'

describe('expert-case-member-data-fixtures', () => {
  it('includes display_profile with zh sections／rows', () => {
    const data = expertCaseMemberDataFixture()
    expect(isRecord(data.profile)).toBe(true)
    const display = parseDisplayProfile(data.profile?.display_profile)
    expect(display).not.toBeNull()
    expect(display!.sections.some(section => section.id === 'conditions')).toBe(true)
    expect(display!.sections.some(section => section.id === 'intake')).toBe(true)
    const conditions = display!.sections.find(section => section.id === 'conditions')
    expect(conditions?.rows[0]?.value_zh).toMatch(/偏頭痛/)
  })

  it('keeps raw snapshot intake bag for fallback path', () => {
    const data = expertCaseMemberDataFixtureWithoutDisplayProfile()
    expect(data.profile?.display_profile).toBeUndefined()
    const intake = data.profile?.snapshot?.intake
    expect(isRecord(intake)).toBe(true)
    expect(isRecord(intake) && 'answered' in intake).toBe(true)
    expect(isRecord(intake) && Array.isArray(intake.diseases)).toBe(true)
  })
})
