import type {
  ExpertBookingProduct,
  ExpertBookingProductWrite
} from '~/utils/expert-booking-product-types'

const DEFAULT_PRODUCT: ExpertBookingProduct = {
  code: 'personal',
  name_zh: '專人預約諮詢',
  name_en: 'Personal expert booking',
  description: '一對一專家預約諮詢服務。',
  description_en: 'One-to-one expert consultation booking.',
  price: 1990,
  active: true,
  updated_at: '2026-11-01T08:00:00+08:00'
}

let mockProduct: ExpertBookingProduct = { ...DEFAULT_PRODUCT }

export function resetExpertBookingProductMockStore() {
  mockProduct = { ...DEFAULT_PRODUCT }
}

export function mockGetExpertBookingProduct(): ExpertBookingProduct {
  return { ...mockProduct }
}

export function mockPutExpertBookingProduct(
  body: ExpertBookingProductWrite
): ExpertBookingProduct {
  mockProduct = {
    ...mockProduct,
    name_zh: body.name_zh,
    name_en: body.name_en === undefined ? mockProduct.name_en : body.name_en,
    description: body.description === undefined ? mockProduct.description : body.description,
    description_en: body.description_en === undefined ? mockProduct.description_en : body.description_en,
    price: body.price,
    active: body.active,
    updated_at: new Date().toISOString()
  }
  return { ...mockProduct }
}
