import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ExpertBookingProductApiError,
  adminGetExpertBookingProduct,
  adminPutExpertBookingProduct,
  parseExpertBookingProductFieldErrors
} from './expert-booking-product-api'
import { resetExpertBookingProductMockStore } from './expert-booking-product-fixtures'

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { expertBookingProductMock: true }
}))

describe('expert-booking-product-api mock', () => {
  afterEach(() => {
    resetExpertBookingProductMockStore()
  })

  it('loads the unique personal product', async () => {
    const row = await adminGetExpertBookingProduct('https://example.test/api/v1', 't')
    expect(row.code).toBe('personal')
    expect(row.price).toBeGreaterThan(0)
    expect(typeof row.active).toBe('boolean')
  })

  it('puts writable fields and ignores create/delete', async () => {
    const updated = await adminPutExpertBookingProduct(
      'https://example.test/api/v1',
      't',
      {
        name_zh: '新名稱',
        name_en: 'New name',
        description: '說明',
        description_en: 'Description',
        price: 3200,
        active: false
      }
    )
    expect(updated.code).toBe('personal')
    expect(updated.name_zh).toBe('新名稱')
    expect(updated.name_en).toBe('New name')
    expect(updated.description).toBe('說明')
    expect(updated.description_en).toBe('Description')
    expect(updated.price).toBe(3200)
    expect(updated.active).toBe(false)

    const again = await adminGetExpertBookingProduct('https://example.test/api/v1', 't')
    expect(again.name_zh).toBe('新名稱')
    expect(again.active).toBe(false)
  })

  it('returns 422 field errors for invalid mock put', async () => {
    await expect(
      adminPutExpertBookingProduct('https://example.test/api/v1', 't', {
        name_zh: '',
        price: 100,
        active: true
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      fields: { name_zh: expect.any(String) }
    })

    await expect(
      adminPutExpertBookingProduct('https://example.test/api/v1', 't', {
        name_zh: 'ok',
        price: 0,
        active: true
      })
    ).rejects.toBeInstanceOf(ExpertBookingProductApiError)
  })
})

describe('parseExpertBookingProductFieldErrors', () => {
  it('reads nested fields map and top-level keys', () => {
    expect(parseExpertBookingProductFieldErrors({
      fields: { name_zh: 'required', price: ['must be > 0'] }
    })).toEqual({
      name_zh: 'required',
      price: 'must be > 0'
    })

    expect(parseExpertBookingProductFieldErrors({
      price: 'bad',
      unknown: 'x'
    })).toEqual({ price: 'bad' })
  })
})
