function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeNutrientKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

/** 將 API 的 detected_nutrients／represented_nutrients 項目轉成顯示文字（依語系對照表）。 */
export function formatNutrientItem(
  item: unknown,
  labelForKey: (key: string) => string
): string {
  if (typeof item === 'string') {
    const key = normalizeNutrientKey(item)
    return key ? labelForKey(key) : ''
  }
  if (isRecord(item)) {
    const keyRaw = item.nutrient_key ?? item.key ?? item.code
    const key = typeof keyRaw === 'string' ? normalizeNutrientKey(keyRaw) : null
    const nameRaw = item.name ?? item.label
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : ''
    if (name && key) {
      const localized = labelForKey(key)
      if (localized !== key) {
        return localized
      }
      return `${name} (${key})`
    }
    if (key) {
      return labelForKey(key)
    }
    if (name) {
      return name
    }
  }
  return String(item ?? '')
}

export function formatNutrientKeyList(
  keys: unknown[],
  labelForKey: (key: string) => string,
  separator = '、'
): string {
  return keys
    .map((item) => {
      if (typeof item === 'string') {
        const key = normalizeNutrientKey(item)
        return key ? labelForKey(key) : ''
      }
      return formatNutrientItem(item, labelForKey)
    })
    .filter(Boolean)
    .join(separator)
}
