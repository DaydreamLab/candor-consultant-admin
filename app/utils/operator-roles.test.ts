import { describe, expect, it } from 'vitest'
import {
  canAccessAdminConsole,
  canAccessExpertStation,
  hasAdminRole,
  hasExpertCapability,
  hasExpertRole,
  hasOpsAdminRole,
  isAdminConsolePath,
  isChoosePanelPath,
  isExpertOnly,
  isExpertStationPath,
  legacyExpertBookmarkRedirect,
  needsSurfaceChooser,
  operatorRoles,
  postLoginHomePath
} from './operator-roles'

describe('operatorRoles', () => {
  it('reads roles[] only and sorts admin→ops→expert', () => {
    expect(operatorRoles({ roles: ['expert'] })).toEqual(['expert'])
    expect(operatorRoles({ roles: ['admin'] })).toEqual(['admin'])
    expect(operatorRoles({ roles: ['admin', 'expert'] })).toEqual(['admin', 'expert'])
    expect(operatorRoles({ roles: ['ops', 'expert', 'ops'] })).toEqual(['ops', 'expert'])
    expect(operatorRoles({ roles: ['expert', 'admin', 'ops'] })).toEqual(['admin', 'ops', 'expert'])
  })

  it('rejects empty or missing roles', () => {
    expect(operatorRoles({ roles: [] })).toEqual([])
    expect(operatorRoles(null)).toEqual([])
    expect(operatorRoles(undefined)).toEqual([])
  })
})

describe('role access helpers', () => {
  it('treats admin as having ops and expert capabilities', () => {
    expect(hasAdminRole(['admin'])).toBe(true)
    expect(hasOpsAdminRole(['admin'])).toBe(true)
    expect(hasExpertCapability(['admin'])).toBe(true)
    expect(hasExpertRole(['admin'])).toBe(false)
    expect(needsSurfaceChooser(['admin'])).toBe(true)
    expect(canAccessAdminConsole(['admin'])).toBe(true)
    expect(canAccessExpertStation(['admin'])).toBe(true)
  })

  it('detects expert-only vs dual-role arrays', () => {
    expect(isExpertOnly(['expert'])).toBe(true)
    expect(isExpertOnly(['admin', 'expert'])).toBe(false)
    expect(needsSurfaceChooser(['admin', 'expert'])).toBe(true)
    expect(needsSurfaceChooser(['ops', 'expert'])).toBe(true)
    expect(needsSurfaceChooser(['expert'])).toBe(false)
    expect(needsSurfaceChooser(['ops'])).toBe(false)
    expect(hasExpertRole(['admin', 'expert'])).toBe(true)
    expect(hasOpsAdminRole(['expert'])).toBe(false)
  })

  it('gates expert station and admin console', () => {
    expect(canAccessExpertStation(['expert'])).toBe(true)
    expect(canAccessExpertStation(['ops'])).toBe(false)
    expect(canAccessAdminConsole(['ops'])).toBe(true)
    expect(canAccessAdminConsole(['expert'])).toBe(false)
    expect(canAccessAdminConsole(['admin', 'expert'])).toBe(true)
    expect(canAccessExpertStation(['admin', 'expert'])).toBe(true)
  })

  it('picks post-login home by roles[]', () => {
    expect(postLoginHomePath(['expert'])).toBe('/expert')
    expect(postLoginHomePath(['ops'])).toBe('/')
    expect(postLoginHomePath(['admin'])).toBe('/choose-panel')
    expect(postLoginHomePath(['admin', 'expert'])).toBe('/choose-panel')
    expect(postLoginHomePath(['ops', 'expert'])).toBe('/choose-panel')
  })
})

describe('path helpers', () => {
  it('recognizes expert station, choose panel, and admin console paths', () => {
    expect(isExpertStationPath('/expert')).toBe(true)
    expect(isExpertStationPath('/expert/bookings')).toBe(true)
    expect(isChoosePanelPath('/choose-panel')).toBe(true)
    expect(isAdminConsolePath('/')).toBe(true)
    expect(isAdminConsolePath('/choose-panel')).toBe(false)
    expect(isAdminConsolePath('/expert')).toBe(false)
  })

  it('maps legacy expert bookmarks under /expert', () => {
    expect(legacyExpertBookmarkRedirect('/bookings')).toBe('/expert/bookings')
    expect(legacyExpertBookmarkRedirect('/calendar/availability')).toBe('/expert/calendar/availability')
    expect(legacyExpertBookmarkRedirect('/')).toBe(null)
  })
})
