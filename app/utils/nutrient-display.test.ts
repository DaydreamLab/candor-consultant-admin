import { describe, expect, it } from 'vitest'
import { formatNutrientItem, formatNutrientKeyList } from './nutrient-display'

const labels: Record<string, string> = {
  folate: 'Folate',
  copper: 'Copper',
  thiamin: 'Thiamin'
}

function labelForKey(key: string) {
  return labels[key] ?? key
}

describe('formatNutrientItem', () => {
  it('localizes string nutrient keys', () => {
    expect(formatNutrientItem('folate', labelForKey)).toBe('Folate')
    expect(formatNutrientItem('copper', labelForKey)).toBe('Copper')
  })

  it('prefers localized name over raw key for objects', () => {
    expect(formatNutrientItem({ nutrient_key: 'folate' }, labelForKey)).toBe('Folate')
  })
})

describe('formatNutrientKeyList', () => {
  it('joins localized keys', () => {
    expect(formatNutrientKeyList(['thiamin', 'folate'], labelForKey)).toBe('Thiamin、Folate')
  })
})
