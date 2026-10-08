export const SAVE_ERROR_FIELDS = [
  'name_zh',
  'daily_servings_min',
  'daily_servings_max',
  'daily_dose',
  'servings_per_container',
  'bottle_price',
  'unit_price',
  'pack_capacity',
  'sku',
  'code'
] as const

export type SaveErrorField = typeof SAVE_ERROR_FIELDS[number]

export function fieldOfSaveError(message: string): SaveErrorField | '' {
  const text = message.trim()
  if (!text) {
    return ''
  }
  let best: { field: SaveErrorField, index: number } | null = null
  for (const field of SAVE_ERROR_FIELDS) {
    const pattern = new RegExp(`(?:^|[^a-z0-9_])${field}(?:[^a-z0-9_]|$)`, 'i')
    const match = pattern.exec(text)
    if (!match) {
      continue
    }
    if (!best || match.index < best.index) {
      best = { field, index: match.index }
    }
  }
  return best?.field ?? ''
}
