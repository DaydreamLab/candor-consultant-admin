import { describe, expect, it } from 'vitest'
import {
  expertCaseMemberName,
  expertCaseUserId,
  formatExpertCaseListTime,
  isExpertCaseDemoRow,
  shortExpertCaseId
} from './expert-case-list-display'

describe('expert-case-list-display', () => {
  it('prefers display name over user id', () => {
    expect(expertCaseMemberName({
      user_display_name: '林小美',
      user_id: 'user_8f3a1111c2'
    })).toBe('林小美')
    expect(expertCaseMemberName({
      user_id: 'user_8f3a1111c2'
    })).toBe('user_8f3…c2')
  })

  it('shortens long ids and leaves short ones intact', () => {
    expect(shortExpertCaseId('user_8f3a1111c2')).toBe('user_8f3…c2')
    expect(shortExpertCaseId('abc')).toBe('abc')
    expect(shortExpertCaseId('')).toBe('—')
  })

  it('detects demo / sample rows', () => {
    expect(isExpertCaseDemoRow({ is_demo: true })).toBe(true)
    expect(isExpertCaseDemoRow({ source: 'mock' })).toBe(true)
    expect(isExpertCaseDemoRow({ source: 'api' })).toBe(false)
  })

  it('formats timestamps in viewer timezone or em-dash', () => {
    expect(formatExpertCaseListTime(null)).toBe('—')
    expect(formatExpertCaseListTime('')).toBe('—')
    expect(formatExpertCaseListTime('not-a-date')).toBe('not-a-date')
    expect(formatExpertCaseListTime('2026-10-25T06:22:00Z', 'Asia/Taipei')).toBe('2026-10-25 14:22')
    expect(formatExpertCaseListTime('2026-10-25T06:22:00Z', 'UTC')).toBe('2026-10-25 06:22')
    expect(formatExpertCaseListTime('2026-10-25 06:22:00+00', 'Asia/Taipei')).toBe('2026-10-25 14:22')
    expect(expertCaseUserId({ user_id: ' user_1 ' })).toBe('user_1')
  })
})
