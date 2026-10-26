import { describe, expect, it } from 'vitest'
import { isDevelopingPath, NAV_GROUPS } from './nav'

describe('sidebar IA (Irice 2026-10-26)', () => {
  it('groups in order: ops → learning → catalog → system → developing', () => {
    expect(NAV_GROUPS.map(g => g.key)).toEqual([
      'ops',
      'learning',
      'catalog',
      'system',
      'developing'
    ])
  })

  it('lists each nav key exactly once (20 items)', () => {
    const keys = NAV_GROUPS.flatMap(g => g.items.map(i => i.key))
    expect(keys).toHaveLength(20)
    expect(new Set(keys).size).toBe(20)
  })

  it('places shipping in cases group with developing badge; progress in developing', () => {
    const ops = NAV_GROUPS.find(g => g.key === 'ops')!
    const developing = NAV_GROUPS.find(g => g.key === 'developing')!
    expect(ops.items.map(i => i.key)).toEqual(['reviews', 'orders', 'shipping', 'users'])
    expect(ops.items.find(i => i.key === 'shipping')?.developing).not.toBe(false)
    expect(developing.items.map(i => i.key)).toContain('progress')
    expect(developing.items.map(i => i.key)).not.toContain('shipping')
  })

  it('marks live official pages as not developing', () => {
    const live = ['reviews', 'orders', 'users', 'knowledge', 'expertTuning', 'packagePlans', 'products', 'settings', 'aiAssistant']
    for (const key of live) {
      const item = NAV_GROUPS.flatMap(g => g.items).find(i => i.key === key)
      expect(item?.developing, key).toBe(false)
    }
  })

  it('isDevelopingPath hides topbar badge on settings and expert-tuning', () => {
    expect(isDevelopingPath('/settings')).toBe(false)
    expect(isDevelopingPath('/expert-tuning')).toBe(false)
    expect(isDevelopingPath('/expert-tuning/daily-learning')).toBe(false)
    expect(isDevelopingPath('/shipping')).toBe(true)
    expect(isDevelopingPath('/progress')).toBe(true)
  })
})
