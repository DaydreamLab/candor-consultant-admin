import { describe, expect, it } from 'vitest'
import {
  buildExpertBookingProductWrite,
  emptyExpertBookingProductFormState,
  expertBookingProductFormIsDirty,
  expertBookingProductFormStateFromProduct,
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
  price: 1990,
  active: true,
  updated_at: '2026-11-01T00:00:00Z'
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
      price: 2500,
      active: true
    })
    expect(write && 'code' in write).toBe(false)
  })
})
