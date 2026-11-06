import { describe, expect, it } from 'vitest'
import {
  canAccessAdminConsole,
  canAccessExpertStation,
  hasExpertRole,
  hasOpsAdminRole,
  isAdminConsolePath,
  isExpertOnly,
  isExpertStationPath,
  legacyExpertBookmarkRedirect,
  operatorRoles,
  postLoginHomePath
} from './operator-roles'

describe('operatorRoles', () => {
  it('falls back to single role', () => {
    expect(operatorRoles({ role: 'expert' })).toEqual(['expert'])
    expect(operatorRoles({ role: 'admin' })).toEqual(['admin'])
  })

  it('prefers roles[] when present', () => {
    expect(operatorRoles({ role: 'admin', roles: ['admin', 'expert'] })).toEqual(['admin', 'expert'])
  })
})

describe('role access helpers', () => {
  it('detects expert-only vs dual-role', () => {
    expect(isExpertOnly(['expert'])).toBe(true)
    expect(isExpertOnly(['admin', 'expert'])).toBe(false)
    expect(hasExpertRole(['admin', 'expert'])).toBe(true)
    expect(hasOpsAdminRole(['admin', 'expert'])).toBe(true)
    expect(hasOpsAdminRole(['expert'])).toBe(false)
  })

  it('gates expert station and admin console', () => {
    expect(canAccessExpertStation(['expert'])).toBe(true)
    expect(canAccessExpertStation(['admin'])).toBe(false)
    expect(canAccessAdminConsole(['ops'])).toBe(true)
    expect(canAccessAdminConsole(['expert'])).toBe(false)
    expect(canAccessAdminConsole(['admin', 'expert'])).toBe(true)
    expect(canAccessExpertStation(['admin', 'expert'])).toBe(true)
  })

  it('picks post-login home by role set', () => {
    expect(postLoginHomePath(['expert'])).toBe('/expert')
    expect(postLoginHomePath(['admin'])).toBe('/')
    expect(postLoginHomePath(['ops'])).toBe('/')
    expect(postLoginHomePath(['admin', 'expert'])).toBe('/')
    expect(postLoginHomePath(['ops', 'expert'])).toBe('/')
  })
})

describe('path helpers', () => {
  it('recognizes expert station and admin console paths', () => {
    expect(isExpertStationPath('/expert')).toBe(true)
    expect(isExpertStationPath('/expert/bookings')).toBe(true)
    expect(isExpertStationPath('/en/expert/bookings')).toBe(true)
    expect(isExpertStationPath('/')).toBe(false)
    expect(isExpertStationPath('/expert-bookings')).toBe(false)
    expect(isAdminConsolePath('/')).toBe(true)
    expect(isAdminConsolePath('/orders')).toBe(true)
    expect(isAdminConsolePath('/login')).toBe(false)
    expect(isAdminConsolePath('/expert')).toBe(false)
  })

  it('maps legacy expert bookmarks under /expert', () => {
    expect(legacyExpertBookmarkRedirect('/bookings')).toBe('/expert/bookings')
    expect(legacyExpertBookmarkRedirect('/bookings/abc/confirm')).toBe('/expert/bookings/abc/confirm')
    expect(legacyExpertBookmarkRedirect('/calendar')).toBe('/expert/calendar')
    expect(legacyExpertBookmarkRedirect('/calendar/availability')).toBe('/expert/calendar/availability')
    expect(legacyExpertBookmarkRedirect('/')).toBe(null)
    expect(legacyExpertBookmarkRedirect('/expert/bookings')).toBe(null)
    expect(legacyExpertBookmarkRedirect('/expert-bookings')).toBe(null)
  })
})
