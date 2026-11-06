/** 專人預約商品（唯一 code=personal；對齊 core／合約）。 */

export type ExpertBookingProduct = {
  code: string
  name_zh: string
  name_en: string | null
  description: string | null
  /** NT$ 整數 */
  price: number
  active: boolean
  updated_at: string | null
}

export type ExpertBookingProductWrite = {
  name_zh: string
  name_en?: string | null
  description?: string | null
  price: number
  active: boolean
}

export type ExpertBookingProductField
  = 'name_zh'
    | 'name_en'
    | 'description'
    | 'price'
    | 'active'

export type ExpertBookingProductFieldErrors = Partial<
  Record<ExpertBookingProductField, string>
>
