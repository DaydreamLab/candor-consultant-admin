import { describe, expect, it } from 'vitest'
import { isDevelopingPath, NAV_GROUPS, visibleNavGroups } from './nav'

describe('sidebar IA (short object names 2026-11-04)', () => {
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

  it('lists each nav key exactly once (25 items)', () => {
    const keys = NAV_GROUPS.flatMap(g => g.items.map(i => i.key))
    expect(keys).toHaveLength(25)
    expect(new Set(keys).size).toBe(25)
  })

  it('places workbench as top-level without badge or group label', () => {
    const top = NAV_GROUPS.find(g => g.key === 'workbench')!
    expect(top.hideLabel).toBe(true)
    expect(top.items).toEqual([
      { key: 'workbench', to: '/', icon: 'i-lucide-layout-dashboard', developing: false }
    ])
    expect(NAV_GROUPS.find(g => g.key === 'developing')!.items.map(i => i.key)).not.toContain('workbench')
  })

  it('places shipping in ops group without badge; fulfillment in developing', () => {
    const ops = NAV_GROUPS.find(g => g.key === 'ops')!
    const developing = NAV_GROUPS.find(g => g.key === 'developing')!
    expect(ops.items.map(i => i.key)).toEqual([
      'custom',
      'orders',
      'expertBookings',
      'refundRequests',
      'shipping',
      'users'
    ])
    expect(ops.items.map(i => i.to)).toEqual([
      '/custom',
      '/orders',
      '/expert-bookings',
      '/refund-requests',
      '/shipping',
      '/users'
    ])
    expect(ops.items.find(i => i.key === 'expertBookings')?.developing).toBe(false)
    expect(ops.items.find(i => i.key === 'shipping')?.developing).toBe(false)
    expect(ops.items.find(i => i.key === 'refundRequests')?.developing).toBe(false)
    expect(developing.items.map(i => i.key)).toContain('fulfillment')
    expect(developing.items.find(i => i.key === 'fulfillment')?.to).toBe('/fulfillment')
    expect(developing.items.map(i => i.key)).not.toContain('shipping')
  })

  it('places checkups in catalog with coming-soon badge; scheduling stays in developing', () => {
    const catalog = NAV_GROUPS.find(g => g.key === 'catalog')!
    const developing = NAV_GROUPS.find(g => g.key === 'developing')!
    expect(catalog.items.map(i => i.key)).toEqual([
      'plans',
      'expertPlans',
      'supplements',
      'checkups'
    ])
    expect(catalog.items.map(i => i.to)).toEqual([
      '/package-plans',
      '/expert-plans',
      '/supplements',
      '/checkups'
    ])
    expect(catalog.items.find(i => i.key === 'expertPlans')?.developing).toBe(false)
    expect(catalog.items.find(i => i.key === 'checkups')?.developing).not.toBe(false)
    expect(developing.items.map(i => i.key)).toEqual([
      'cases',
      'scheduling',
      'appointments',
      'fulfillment',
      'selections',
      'invoices',
      'reports',
      'orgs'
    ])
    expect(developing.items.find(i => i.key === 'scheduling')?.to).toBe('/scheduling')
    expect(developing.items.map(i => i.key)).not.toContain('checkups')
  })

  it('settings group order: settings → privacy → guidance → assistant', () => {
    const system = NAV_GROUPS.find(g => g.key === 'system')!
    expect(system.items.map(i => i.key)).toEqual([
      'settings',
      'privacy',
      'guidance',
      'assistant'
    ])
    expect(system.items.map(i => i.to)).toEqual([
      '/settings#payment',
      '/settings/privacy',
      '/settings/guidance',
      '/assistant'
    ])
    expect(system.items.find(i => i.key === 'settings')?.exact).toBe(true)
    expect(system.items.find(i => i.key === 'guidance')?.guidanceOnly).toBe(true)
  })

  it('hides guidance nav for expert; keeps privacy/settings/assistant', () => {
    const adminKeys = visibleNavGroups('consultant_admin', 'admin')
      .find(g => g.key === 'system')!
      .items
      .map(i => i.key)
    const expertKeys = visibleNavGroups('consultant_ops', 'expert')
      .find(g => g.key === 'system')!
      .items
      .map(i => i.key)
    expect(adminKeys).toEqual(['settings', 'privacy', 'guidance', 'assistant'])
    expect(expertKeys).toEqual(['settings', 'privacy', 'assistant'])
  })

  it('hides refundRequests nav for expert; keeps it for ops／admin', () => {
    expect(NAV_GROUPS.flatMap(g => g.items).find(i => i.key === 'refundRequests')?.opsAdminOnly).toBe(true)
    const adminOps = visibleNavGroups('consultant_admin', 'admin').find(g => g.key === 'ops')!.items.map(i => i.key)
    const opsOps = visibleNavGroups('consultant_ops', 'ops').find(g => g.key === 'ops')!.items.map(i => i.key)
    const expertOps = visibleNavGroups('consultant_ops', 'expert').find(g => g.key === 'ops')!.items.map(i => i.key)
    expect(adminOps).toContain('refundRequests')
    expect(opsOps).toContain('refundRequests')
    expect(expertOps).not.toContain('refundRequests')
  })

  it('marks live official pages as not developing', () => {
    const live = [
      'workbench',
      'custom',
      'orders',
      'expertBookings',
      'refundRequests',
      'shipping',
      'users',
      'knowledge',
      'weights',
      'plans',
      'expertPlans',
      'supplements',
      'settings',
      'privacy',
      'guidance',
      'assistant'
    ]
    for (const key of live) {
      const item = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === key)
      expect(item?.developing, key).toBe(false)
    }
  })

  it('isDevelopingPath hides topbar badge on overview, settings split, weights, and shipping', () => {
    expect(isDevelopingPath('/')).toBe(false)
    expect(isDevelopingPath('/settings')).toBe(false)
    expect(isDevelopingPath('/settings/privacy')).toBe(false)
    expect(isDevelopingPath('/settings/guidance')).toBe(false)
    expect(isDevelopingPath('/weights')).toBe(false)
    expect(isDevelopingPath('/weights/daily-learning')).toBe(false)
    expect(isDevelopingPath('/custom')).toBe(false)
    expect(isDevelopingPath('/supplements')).toBe(false)
    expect(isDevelopingPath('/assistant')).toBe(false)
    expect(isDevelopingPath('/shipping')).toBe(false)
    expect(isDevelopingPath('/expert-plans')).toBe(false)
    expect(isDevelopingPath('/refund-requests')).toBe(false)
    expect(isDevelopingPath('/expert-bookings')).toBe(false)
    expect(isDevelopingPath('/expert-bookings/eb-1')).toBe(false)
    expect(isDevelopingPath('/checkups')).toBe(true)
    expect(isDevelopingPath('/fulfillment')).toBe(true)
    expect(isDevelopingPath('/scheduling')).toBe(true)
  })

  it('settings nav targets first payment hash to avoid empty-hash entry', () => {
    const settings = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === 'settings')
    expect(settings?.to).toBe('/settings#payment')
  })

  it('places weights under learning at /weights', () => {
    const learning = NAV_GROUPS.find(g => g.key === 'learning')!
    expect(learning.items.map(i => i.to)).toEqual(['/knowledge/datasets', '/weights'])
    expect(learning.items.map(i => i.key)).toEqual(['knowledge', 'weights'])
  })
})
