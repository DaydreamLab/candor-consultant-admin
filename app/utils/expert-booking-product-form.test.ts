import { describe, expect, it } from 'vitest'
import {
  buildExpertBookingProductWrite,
  digitsOnlyPrice,
  emptyExpertBookingProductFormState,
  expertBookingProductFormIsDirty,
  expertBookingProductFormStateFromProduct,
  expertBookingProductSaveConfirmKind,
  formatExpertBookingProductUpdatedAt,
  formatPriceNtLabel,
  formatPriceWithComma,
  parsePositiveIntPrice,
  snapshotFromExpertBookingProduct,
  validateExpertBookingProductForm
} from './expert-booking-product-form'
import type { ExpertBookingProduct } from './expert-booking-product-types'

const product: ExpertBookingProduct = {
  code: 'personal',
  name_zh: '專人預約諮詢',
  name_en: 'Personal',
  description: 'desc',
  description_en: 'English desc',
  price: 1990,
  active: true,
  updated_at: '2026-11-01T08:00:00+08:00'
}

describe('expert-booking-product-form', () => {
  it('parses positive integer prices only', () => {
    expect(parsePositiveIntPrice('1990')).toBe(1990)
    expect(parsePositiveIntPrice(1990)).toBe(1990)
    expect(parsePositiveIntPrice('0')).toBeNull()
    expect(parsePositiveIntPrice(0)).toBeNull()
    expect(parsePositiveIntPrice('-1')).toBeNull()
    expect(parsePositiveIntPrice('19.9')).toBeNull()
    expect(parsePositiveIntPrice(19.9)).toBeNull()
    expect(parsePositiveIntPrice('')).toBeNull()
  })

  it('formats and strips thousand separators', () => {
    expect(formatPriceWithComma('1990')).toBe('1,990')
    expect(formatPriceWithComma(1990)).toBe('1,990')
    expect(formatPriceNtLabel(1990)).toBe('NT$1,990')
    expect(digitsOnlyPrice('1,990')).toBe('1990')
    expect(digitsOnlyPrice('NT$2,880')).toBe('2880')
  })

  it('formats updated_at in Asia/Taipei as YYYY/MM/DD HH:mm', () => {
    expect(formatExpertBookingProductUpdatedAt('2026-11-01T08:00:00+08:00')).toBe('2026/11/01 08:00')
    expect(formatExpertBookingProductUpdatedAt('2026-11-01T00:00:00Z')).toBe('2026/11/01 08:00')
    expect(formatExpertBookingProductUpdatedAt(null)).toBe('')
    expect(formatExpertBookingProductUpdatedAt('')).toBe('')
  })

  it('requires name_zh and positive price', () => {
    const state = emptyExpertBookingProductFormState()
    expect(validateExpertBookingProductForm(state)).toBe('name_zh')
    state.name_zh = '  '
    expect(validateExpertBookingProductForm(state)).toBe('name_zh')
    state.name_zh = '名稱'
    state.price = '0'
    expect(validateExpertBookingProductForm(state)).toBe('price')
    state.price = '100'
    expect(validateExpertBookingProductForm(state)).toBeNull()
  })

  it('tracks dirty against snapshot and builds write body without code', () => {
    const state = expertBookingProductFormStateFromProduct(product)
    const baseline = snapshotFromExpertBookingProduct(product)
    expect(expertBookingProductFormIsDirty(baseline, state)).toBe(false)

    state.price = '2500'
    expect(expertBookingProductFormIsDirty(baseline, state)).toBe(true)

    const write = buildExpertBookingProductWrite(state)
    expect(write).toEqual({
      name_zh: '專人預約諮詢',
      name_en: 'Personal',
      description: 'desc',
      description_en: 'English desc',
      price: 2500,
      active: true
    })
    expect(write && 'code' in write).toBe(false)
  })

  it('chooses save confirm kind from price / inactive changes only', () => {
    const baseline = snapshotFromExpertBookingProduct(product)
    const state = expertBookingProductFormStateFromProduct(product)

    expect(expertBookingProductSaveConfirmKind(baseline, state)).toBeNull()

    state.name_zh = '新名稱'
    expect(expertBookingProductSaveConfirmKind(baseline, state)).toBeNull()

    state.price = '2880'
    expect(expertBookingProductSaveConfirmKind(baseline, state)).toBe('price')

    state.price = '1990'
    state.active = false
    expect(expertBookingProductSaveConfirmKind(baseline, state)).toBe('inactive')

    state.price = '2880'
    expect(expertBookingProductSaveConfirmKind(baseline, state)).toBe('price_and_inactive')
  })
})
