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
  description_en: string
  price: string
  active: boolean
}

export type ExpertBookingProductSnapshot = {
  name_zh: string
  name_en: string | null
  description: string | null
  description_en: string | null
  price: number
  active: boolean
}

export function emptyExpertBookingProductFormState(): ExpertBookingProductFormState {
  return {
    code: '',
    name_zh: '',
    name_en: '',
    description: '',
    description_en: '',
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
    description_en: product.description_en ?? '',
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
    description_en: product.description_en,
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
    || normalizeOptionalText(state.description_en) !== baseline.description_en
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
    description_en: normalizeOptionalText(state.description_en),
    price,
    active: state.active
  }
}

/** Digits-only price string for form state / PUT. */
export function digitsOnlyPrice(raw: string | number | null | undefined): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Number.isInteger(raw) && raw > 0 ? String(raw) : ''
  }
  if (typeof raw !== 'string') {
    return ''
  }
  return raw.replace(/\D/g, '')
}

/** Display price with thousand separators（e.g. 1,990）. */
export function formatPriceWithComma(raw: string | number | null | undefined): string {
  const digits = digitsOnlyPrice(raw)
  if (!digits) {
    return ''
  }
  return Number(digits).toLocaleString('en-US')
}

/** NT$1,990 style label for preview / confirm copy. */
export function formatPriceNtLabel(raw: string | number | null | undefined): string {
  const formatted = formatPriceWithComma(raw)
  return formatted ? `NT$${formatted}` : ''
}

/**
 * Format API `updated_at` as YYYY/MM/DD HH:mm in Asia/Taipei.
 * Empty / unparsable → ''.
 */
export function formatExpertBookingProductUpdatedAt(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return ''
  }
  let normalized = value.trim()
  normalized = normalized.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2')
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00')
  normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  const ms = Date.parse(normalized)
  if (Number.isNaN(ms)) {
    return ''
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(ms))
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '00'
  return `${pick('year')}/${pick('month')}/${pick('day')} ${pick('hour')}:${pick('minute')}`
}

export type ExpertBookingProductSaveConfirmKind
  = 'price'
    | 'inactive'
    | 'price_and_inactive'
    | null

/** Confirm dialog only when price changed and/or became inactive. */
export function expertBookingProductSaveConfirmKind(
  baseline: ExpertBookingProductSnapshot | null,
  state: ExpertBookingProductFormState
): ExpertBookingProductSaveConfirmKind {
  if (!baseline) {
    return null
  }
  const price = parsePositiveIntPrice(state.price)
  const priceChanged = price !== null && price !== baseline.price
  const becameInactive = baseline.active && !state.active
  if (priceChanged && becameInactive) {
    return 'price_and_inactive'
  }
  if (priceChanged) {
    return 'price'
  }
  if (becameInactive) {
    return 'inactive'
  }
  return null
}
