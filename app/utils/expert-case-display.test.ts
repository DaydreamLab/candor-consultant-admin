import { describe, expect, it } from 'vitest'
import {
  adjustmentReasonIsMemberFacing,
  adjustmentTypeKey,
  excludedReasonParts,
  formatScoreNorm,
  itemRationaleText,
  parseAdjustments,
  parseExcludedRows,
  parseItemRationale,
  profileFieldLabelKey,
  sortItemsByScoreNorm,
  tierLabelKey
} from './expert-case-display'

describe('expert-case-display', () => {
  it('formats score_norm to two decimals and rejects non-numbers', () => {
    expect(formatScoreNorm(1)).toBe('1.00')
    expect(formatScoreNorm(0.75)).toBe('0.75')
    expect(formatScoreNorm(null)).toBeNull()
    expect(formatScoreNorm('0.5')).toBeNull()
  })

  it('parses item_rationale objects with reason; null otherwise', () => {
    expect(parseItemRationale({ reason: '建議補充鎂成份：鎂', code: 'mg' })).toEqual({
      reason: '建議補充鎂成份：鎂',
      code: 'mg'
    })
    expect(itemRationaleText({ reason: '  hello  ' })).toBe('hello')
    expect(parseItemRationale(null)).toBeNull()
    expect(parseItemRationale({ reason: '   ' })).toBeNull()
    expect(parseItemRationale({ line: 'no reason key' })).toBeNull()
  })

  it('sorts items by score_norm descending; missing scores last', () => {
    const sorted = sortItemsByScoreNorm([
      { id: 'a', score_norm: 0.5 },
      { id: 'b', score_norm: 1 },
      { id: 'c' },
      { id: 'd', score_norm: 0.75 }
    ])
    expect(sorted.map(row => row.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('maps tier to primary/secondary/unknown', () => {
    expect(tierLabelKey('primary')).toBe('primary')
    expect(tierLabelKey('secondary')).toBe('secondary')
    expect(tierLabelKey('other')).toBe('unknown')
  })

  it('maps excluded reason_code kinds including contraindication_ prefix', () => {
    expect(excludedReasonParts('dose_above_ul').kind).toBe('dose_above_ul')
    expect(excludedReasonParts('interaction_exclude').kind).toBe('interaction_exclude')
    expect(excludedReasonParts('diet_incompatible').kind).toBe('diet_incompatible')
    expect(excludedReasonParts('contraindication_pregnancy')).toEqual({
      kind: 'contraindication',
      conditionCode: 'pregnancy',
      raw: 'contraindication_pregnancy'
    })
    expect(excludedReasonParts('mystery_code')).toEqual({
      kind: 'other',
      conditionCode: null,
      raw: 'mystery_code'
    })
  })

  it('parses excluded and adjustments arrays from snapshot / detail', () => {
    expect(parseExcludedRows({
      excluded: [
        { sellable_item_id: 's1', reason_code: 'dose_above_ul', name: '維生素 A' },
        { sellable_item_id: 1 }
      ]
    })).toEqual([
      { sellable_item_id: 's1', reason_code: 'dose_above_ul', name: '維生素 A' }
    ])

    const rows = parseAdjustments([
      {
        type: 'swap',
        package_plan_code: 'basic',
        original_item: { sellable_item_id: 'a', name: 'A', daily_dose: 1 },
        new_item: { sellable_item_id: 'b', name: 'B', code: 'b', daily_dose: 2 },
        reason: '更好吸收',
        operator_role: 'expert',
        adjusted_at: '2026-10-21T00:00:00Z'
      },
      { type: 'remove' }
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.type).toBe('swap')
    expect(rows[0]?.original_item?.name).toBe('A')
    expect(rows[0]?.new_item?.code).toBe('b')
  })

  it('marks swap/add reasons as member-facing; remove/dose_change as admin-only', () => {
    expect(adjustmentReasonIsMemberFacing('swap')).toBe(true)
    expect(adjustmentReasonIsMemberFacing('add')).toBe(true)
    expect(adjustmentReasonIsMemberFacing('remove')).toBe(false)
    expect(adjustmentReasonIsMemberFacing('dose_change')).toBe(false)
    expect(adjustmentTypeKey('dose_change')).toBe('dose_change')
    expect(adjustmentTypeKey('nope')).toBe('unknown')
  })

  it('recognizes profile snapshot field keys', () => {
    expect(profileFieldLabelKey('age_years')).toBe('age_years')
    expect(profileFieldLabelKey('birth_year')).toBe('unknown')
  })
})

describe('expert-case-display weight background parsers', () => {
  it('parses package rationales with groups and body fallback', async () => {
    const { parsePackageRationales } = await import('./expert-case-display')
    const rows = parsePackageRationales({
      packages: [
        {
          package_plan_code: 'basic',
          package_plan_name: '基礎',
          rationale: {
            headline: '評估',
            body: 'fallback body',
            groups: [
              {
                key: 'goal:1',
                title: '免疫',
                entries: [{ line: '建議補充維生素C', name: '維生素 C', ingredient_label: '維生素C' }]
              }
            ]
          }
        }
      ]
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.headline).toBe('評估')
    expect(rows[0]?.groups[0]?.lines).toEqual(['建議補充維生素C'])
  })

  it('parses top_domains severity and contribution key/value rows', async () => {
    const {
      parseTopDomains,
      parseItemContributionBlocks,
      contributionToRows
    } = await import('./expert-case-display')
    expect(parseTopDomains({
      top_domains: [{ domain_id: 'd1', name: '關節', severity: 0.7 }]
    })).toEqual([{ domain_id: 'd1', name: '關節', severity: 0.7 }])

    expect(contributionToRows({ weight: 0.42, domain: 'sleep' })).toEqual([
      { key: 'domain', value: 'sleep' },
      { key: 'weight', value: '0.42' }
    ])

    const blocks = parseItemContributionBlocks({
      packages: [{
        package_plan_code: 'basic',
        items: [{
          sellable_item_id: 's1',
          name: '鎂',
          explanation: {
            contributions: [{ weight: 0.5, signal: 'goal' }]
          }
        }]
      }]
    })
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.contributions[0]).toEqual([
      { key: 'signal', value: 'goal' },
      { key: 'weight', value: '0.5' }
    ])
  })
})
