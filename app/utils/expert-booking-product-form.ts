import type {
  ExpertBookingProduct,
  ExpertBookingProductField,
  ExpertBookingProductWrite
} from '~/utils/expert-booking-product-types'

export type ExpertBookingProductFormState = {
  code: string
  name_zh: string
  name_en: string
  description: string
  price: string
  active: boolean
}

export type ExpertBookingProductSnapshot = {
  name_zh: string
  name_en: string | null
  description: string | null
  price: number
  active: boolean
}

export function emptyExpertBookingProductFormState(): ExpertBookingProductFormState {
  return {
    code: '',
    name_zh: '',
    name_en: '',
    description: '',
    price: '',
    active: true
  }
}

export function expertBookingProductFormStateFromProduct(
  product: ExpertBookingProduct
): ExpertBookingProductFormState {
  return {
    code: product.code,
    name_zh: product.name_zh,
    name_en: product.name_en ?? '',
    description: product.description ?? '',
    price: String(product.price),
    active: product.active
  }
}

export function snapshotFromExpertBookingProduct(
  product: ExpertBookingProduct
): ExpertBookingProductSnapshot {
  return {
    name_zh: product.name_zh,
    name_en: product.name_en,
    description: product.description,
    price: product.price,
    active: product.active
  }
}

export function normalizeOptionalText(value: string | number | null | undefined): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/** UInput type=number 可能回傳 number；仍要求整數 > 0。 */
export function parsePositiveIntPrice(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null
  }
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const n = Number.parseInt(trimmed, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Client-side validation before PUT. Returns first failing field. */
function textValue(value: string | number | null | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return typeof value === 'string' ? value : ''
}

export function validateExpertBookingProductForm(
  state: ExpertBookingProductFormState
): ExpertBookingProductField | null {
  if (!textValue(state.name_zh).trim()) {
    return 'name_zh'
  }
  if (parsePositiveIntPrice(state.price) === null) {
    return 'price'
  }
  return null
}

export function expertBookingProductFormIsDirty(
  baseline: ExpertBookingProductSnapshot | null,
  state: ExpertBookingProductFormState
): boolean {
  if (!baseline) {
    return false
  }
  const price = parsePositiveIntPrice(state.price)
  return (
    textValue(state.name_zh).trim() !== baseline.name_zh
    || normalizeOptionalText(state.name_en) !== baseline.name_en
    || normalizeOptionalText(state.description) !== baseline.description
    || price !== baseline.price
    || state.active !== baseline.active
  )
}

export function buildExpertBookingProductWrite(
  state: ExpertBookingProductFormState
): ExpertBookingProductWrite | null {
  const price = parsePositiveIntPrice(state.price)
  const nameZh = textValue(state.name_zh).trim()
  if (!nameZh || price === null) {
    return null
  }
  return {
    name_zh: nameZh,
    name_en: normalizeOptionalText(state.name_en),
    description: normalizeOptionalText(state.description),
    price,
    active: state.active
  }
}
