import { describe, expect, it } from 'vitest'
import {
  defaultDoseForItem,
  filterSellablePickRows,
  isOnSaleStatus,
  parseSellablePickRow,
  reasonIsFilled,
  validateDailyDose,
  type SellablePickRow
} from './expert-case-sellable'

const onSale: SellablePickRow = {
  id: 'a',
  name: '維生素 D',
  code: 'VD',
  sku: 'SKU-D',
  sale_status: 'on_sale',
  daily_dose: 1,
  daily_servings_min: 0.5,
  daily_servings_max: 2
}

const offSale: SellablePickRow = {
  ...onSale,
  id: 'b',
  name: '停售品',
  sale_status: 'off_sale'
}

describe('expert-case-sellable', () => {
  it('parses sellable rows and detects on_sale', () => {
    expect(isOnSaleStatus('on_sale')).toBe(true)
    expect(isOnSaleStatus('off_sale')).toBe(false)
    const row = parseSellablePickRow({
      id: 'uuid-1',
      name_zh: '魚油',
      code: 'FO',
      sku: 'S1',
      sale_status: 'on_sale',
      daily_dose: 2,
      daily_servings_min: 1,
      daily_servings_max: 3
    })
    expect(row).toEqual({
      id: 'uuid-1',
      name: '魚油',
      code: 'FO',
      sku: 'S1',
      sale_status: 'on_sale',
      daily_dose: 2,
      daily_servings_min: 1,
      daily_servings_max: 3
    })
  })

  it('filters to on_sale and search', () => {
    expect(filterSellablePickRows([onSale, offSale])).toEqual([onSale])
    expect(filterSellablePickRows([onSale, offSale], '停售')).toEqual([])
    expect(filterSellablePickRows([onSale, offSale], 'sku-d')).toEqual([onSale])
  })

  it('validates daily dose against min/max', () => {
    expect(validateDailyDose('', onSale).ok).toBe(false)
    expect(validateDailyDose('0', onSale)).toMatchObject({ ok: false, code: 'invalid' })
    expect(validateDailyDose('0.2', onSale)).toMatchObject({ ok: false, code: 'below_min' })
    expect(validateDailyDose('5', onSale)).toMatchObject({ ok: false, code: 'above_max' })
    expect(validateDailyDose('1', onSale)).toEqual({ ok: true, dose: 1 })
  })

  it('defaults dose from item catalog fields only', () => {
    expect(defaultDoseForItem(onSale)).toBe('1')
    expect(defaultDoseForItem({ ...onSale, daily_dose: null })).toBe('0.5')
    expect(reasonIsFilled('  ')).toBe(false)
    expect(reasonIsFilled('換為較適合的劑型')).toBe(true)
  })
})
