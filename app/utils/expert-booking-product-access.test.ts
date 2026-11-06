import { describe, expect, it } from 'vitest'
import {
  canEditExpertBookingProduct,
  canViewExpertBookingProduct
} from './expert-booking-product-access'

describe('expert-booking-product-access', () => {
  it('hides product settings from expert-only', () => {
    expect(canViewExpertBookingProduct(['expert'])).toBe(false)
    expect(canEditExpertBookingProduct(['expert'])).toBe(false)
  })

  it('allows ops read-only', () => {
    expect(canViewExpertBookingProduct(['ops'])).toBe(true)
    expect(canEditExpertBookingProduct(['ops'])).toBe(false)
  })

  it('allows admin edit', () => {
    expect(canViewExpertBookingProduct(['admin'])).toBe(true)
    expect(canEditExpertBookingProduct(['admin'])).toBe(true)
  })

  it('treats missing roles as no access', () => {
    expect(canViewExpertBookingProduct(null)).toBe(false)
    expect(canEditExpertBookingProduct(undefined)).toBe(false)
  })
})
