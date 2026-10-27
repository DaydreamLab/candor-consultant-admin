import { describe, expect, it } from 'vitest'
import { isDevelopingPath, NAV_GROUPS, visibleNavGroups } from './nav'

describe('sidebar IA (Irice 2026-10-27 workbench top + settings split)', () => {
  it('groups in order: workbench → ops → learning → catalog → system → developing', () => {
    expect(NAV_GROUPS.map(g => g.key)).toEqual([
      'workbench',
      'ops',
      'learning',
      'catalog',
      'system',
      'developing'
    ])
  })

  it('lists each nav key exactly once (22 items)', () => {
    const keys = NAV_GROUPS.flatMap(g => g.items.map(i => i.key))
    expect(keys).toHaveLength(22)
    expect(new Set(keys).size).toBe(22)
  })

  it('places workbench as top-level without badge or group label', () => {
    const top = NAV_GROUPS.find(g => g.key === 'workbench')!
    expect(top.hideLabel).toBe(true)
    expect(top.items).toEqual([
      { key: 'workbench', to: '/', icon: 'i-lucide-layout-dashboard', developing: false }
    ])
    expect(NAV_GROUPS.find(g => g.key === 'developing')!.items.map(i => i.key)).not.toContain('workbench')
  })

  it('places shipping in cases group without badge; progress in developing', () => {
    const ops = NAV_GROUPS.find(g => g.key === 'ops')!
    const developing = NAV_GROUPS.find(g => g.key === 'developing')!
    expect(ops.items.map(i => i.key)).toEqual(['reviews', 'orders', 'shipping', 'users'])
    expect(ops.items.find(i => i.key === 'shipping')?.developing).toBe(false)
    expect(developing.items.map(i => i.key)).toContain('progress')
    expect(developing.items.map(i => i.key)).not.toContain('shipping')
  })

  it('places labServices in catalog with coming-soon badge; labs stay in developing', () => {
    const catalog = NAV_GROUPS.find(g => g.key === 'catalog')!
    const developing = NAV_GROUPS.find(g => g.key === 'developing')!
    expect(catalog.items.map(i => i.key)).toEqual(['packagePlans', 'products', 'labServices'])
    expect(catalog.items.find(i => i.key === 'labServices')?.developing).not.toBe(false)
    expect(developing.items.map(i => i.key)).toEqual([
      'cases',
      'labs',
      'labAppointments',
      'progress',
      'selections',
      'invoices',
      'reports',
      'orgs'
    ])
    expect(developing.items.map(i => i.key)).not.toContain('labServices')
  })

  it('settings group order: settings → privacy → CTA → AI', () => {
    const system = NAV_GROUPS.find(g => g.key === 'system')!
    expect(system.items.map(i => i.key)).toEqual([
      'settings',
      'privacy',
      'ctaCatalog',
      'aiAssistant'
    ])
    expect(system.items.map(i => i.to)).toEqual([
      '/settings#payment',
      '/settings/privacy',
      '/settings/cta-catalog',
      '/ai-assistant'
    ])
    expect(system.items.find(i => i.key === 'settings')?.exact).toBe(true)
    expect(system.items.find(i => i.key === 'ctaCatalog')?.ctaCatalogOnly).toBe(true)
  })

  it('hides CTA catalog nav for expert; keeps privacy/settings/AI', () => {
    const adminKeys = visibleNavGroups('consultant_admin', 'admin')
      .find(g => g.key === 'system')!
      .items
      .map(i => i.key)
    const expertKeys = visibleNavGroups('consultant_ops', 'expert')
      .find(g => g.key === 'system')!
      .items
      .map(i => i.key)
    expect(adminKeys).toEqual(['settings', 'privacy', 'ctaCatalog', 'aiAssistant'])
    expect(expertKeys).toEqual(['settings', 'privacy', 'aiAssistant'])
  })

  it('marks live official pages as not developing', () => {
    const live = [
      'workbench',
      'reviews',
      'orders',
      'shipping',
      'users',
      'knowledge',
      'expertTuning',
      'packagePlans',
      'products',
      'settings',
      'privacy',
      'ctaCatalog',
      'aiAssistant'
    ]
    for (const key of live) {
      const item = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === key)
      expect(item?.developing, key).toBe(false)
    }
  })

  it('isDevelopingPath hides topbar badge on overview, settings split, expert-tuning, and shipping', () => {
    expect(isDevelopingPath('/')).toBe(false)
    expect(isDevelopingPath('/settings')).toBe(false)
    expect(isDevelopingPath('/settings/privacy')).toBe(false)
    expect(isDevelopingPath('/settings/cta-catalog')).toBe(false)
    expect(isDevelopingPath('/expert-tuning')).toBe(false)
    expect(isDevelopingPath('/expert-tuning/daily-learning')).toBe(false)
    expect(isDevelopingPath('/shipping')).toBe(false)
    expect(isDevelopingPath('/lab-services')).toBe(true)
    expect(isDevelopingPath('/progress')).toBe(true)
  })

  it('settings nav targets first payment hash to avoid empty-hash entry', () => {
    const settings = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === 'settings')
    expect(settings?.to).toBe('/settings#payment')
  })
})
