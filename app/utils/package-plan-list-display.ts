function optionalStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function readText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return null
}

export function packagePlanHighlight(row: Record<string, unknown>): boolean {
  if (row.highlight === true || row.home_highlight === true) {
    return true
  }
  return false
}

export function packagePlanBadge(row: Record<string, unknown>, locale: string): string | null {
  const en = readText(row.badge_en) ?? readText(row.home_badge_en)
  const zh = readText(row.badge) ?? readText(row.home_badge_zh)
  if (String(locale).startsWith('en')) {
    return en || zh
  }
  return zh || en
}

export function packagePlanHomeFeatures(row: Record<string, unknown>, locale: string): string[] {
  const en = optionalStringList(row.features_en)
  const zh = optionalStringList(row.features)
  const legacyEn = optionalStringList(row.home_features_en)
  const legacyZh = optionalStringList(row.home_features_zh)
  if (String(locale).startsWith('en')) {
    return en.length ? en : legacyEn.length ? legacyEn : zh.length ? zh : legacyZh
  }
  return zh.length ? zh : legacyZh.length ? legacyZh : en.length ? en : legacyEn
}
