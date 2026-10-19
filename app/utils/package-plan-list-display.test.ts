import { describe, expect, it } from 'vitest'
import {
  packagePlanBadge,
  packagePlanHighlight,
  packagePlanHomeFeatures
} from './package-plan-list-display'

const row = {
  price: 6000,
  original_price: 12000,
  badge: '推薦',
  badge_en: 'Recommended',
  highlight: true,
  features: ['功能甲', '功能乙'],
  features_en: ['Feature A']
}

describe('packagePlanListDisplay', () => {
  it('reads badge and highlight from API fields', () => {
    expect(packagePlanBadge(row, 'zh-TW')).toBe('推薦')
    expect(packagePlanBadge(row, 'en')).toBe('Recommended')
    expect(packagePlanHighlight(row)).toBe(true)
  })

  it('picks localized home feature lists', () => {
    expect(packagePlanHomeFeatures(row, 'zh-TW')).toEqual(['功能甲', '功能乙'])
    expect(packagePlanHomeFeatures(row, 'en')).toEqual(['Feature A'])
  })
})
