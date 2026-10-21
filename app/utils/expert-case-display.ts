/**
 * Display helpers for expert-case-review detail (admin).
 * Field shapes follow candor-core OpenAPI / spec 32 (#73 member-data, #74 items／adjustments).
 * Do not surface weight numbers (including explanation.contributions).
 */

export type ExpertCaseItemRationale = {
  reason: string
  [key: string]: unknown
} | null

export type ExpertCaseExcludedRow = {
  sellable_item_id: string
  reason_code: string
  name?: string | null
}

export type ExpertCaseAdjustmentItem = {
  sellable_item_id: string
  name: string
  code?: string | null
  daily_dose?: number | null
}

export type ExpertCaseAdjustmentType = 'swap' | 'add' | 'remove' | 'dose_change'

export type ExpertCaseAdjustment = {
  type: ExpertCaseAdjustmentType | string
  package_plan_code: string
  original_item?: ExpertCaseAdjustmentItem | null
  new_item?: ExpertCaseAdjustmentItem | null
  reason?: string | null
  operator_id?: string | null
  operator_display_name?: string | null
  operator_role?: string | null
  adjusted_at?: string | null
}

export type ExpertCaseProfileSnapshot = {
  sex?: unknown
  age_years?: unknown
  height_cm?: unknown
  weight_kg?: unknown
  diet?: unknown
  goals?: unknown
  conditions?: unknown
  intake?: unknown
  [key: string]: unknown
}

export const PROFILE_FIELD_KEYS = [
  'sex',
  'age_years',
  'height_cm',
  'weight_kg',
  'diet',
  'goals',
  'conditions',
  'intake'
] as const

export type ProfileFieldKey = (typeof PROFILE_FIELD_KEYS)[number]

/** Format score_norm for display (number only; plain-language slot is filled separately). */
export function formatScoreNorm(score: unknown): string | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null
  }
  return score.toFixed(2)
}

export function parseItemRationale(value: unknown): ExpertCaseItemRationale {
  if (!isRecord(value)) {
    return null
  }
  if (typeof value.reason !== 'string' || !value.reason.trim()) {
    return null
  }
  return value as { reason: string, [key: string]: unknown }
}

export function itemRationaleText(value: unknown): string | null {
  const parsed = parseItemRationale(value)
  return parsed ? parsed.reason.trim() : null
}

/** Sort package items by score_norm desc; missing scores sink to the end. */
export function sortItemsByScoreNorm<T extends Record<string, unknown>>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const sa = typeof a.score_norm === 'number' && Number.isFinite(a.score_norm) ? a.score_norm : null
    const sb = typeof b.score_norm === 'number' && Number.isFinite(b.score_norm) ? b.score_norm : null
    if (sa == null && sb == null) {
      return 0
    }
    if (sa == null) {
      return 1
    }
    if (sb == null) {
      return -1
    }
    return sb - sa
  })
}

export function tierLabelKey(tier: unknown): 'primary' | 'secondary' | 'unknown' {
  if (tier === 'primary') {
    return 'primary'
  }
  if (tier === 'secondary') {
    return 'secondary'
  }
  return 'unknown'
}

export function profileFieldLabelKey(field: string): ProfileFieldKey | 'unknown' {
  if ((PROFILE_FIELD_KEYS as readonly string[]).includes(field)) {
    return field as ProfileFieldKey
  }
  return 'unknown'
}

/**
 * Map excluded.reason_code to an i18n key suffix + optional condition code.
 * Unknown codes → other + raw code for display.
 */
export function excludedReasonParts(reasonCode: unknown): {
  kind: 'dose_above_ul' | 'contraindication' | 'interaction_exclude' | 'diet_incompatible' | 'other'
  conditionCode: string | null
  raw: string
} {
  const raw = typeof reasonCode === 'string' ? reasonCode : ''
  if (raw === 'dose_above_ul') {
    return { kind: 'dose_above_ul', conditionCode: null, raw }
  }
  if (raw === 'interaction_exclude') {
    return { kind: 'interaction_exclude', conditionCode: null, raw }
  }
  if (raw === 'diet_incompatible') {
    return { kind: 'diet_incompatible', conditionCode: null, raw }
  }
  if (raw.startsWith('contraindication_')) {
    const conditionCode = raw.slice('contraindication_'.length) || null
    return { kind: 'contraindication', conditionCode, raw }
  }
  return { kind: 'other', conditionCode: null, raw: raw || 'unknown' }
}

export function adjustmentTypeKey(type: unknown): ExpertCaseAdjustmentType | 'unknown' {
  if (type === 'swap' || type === 'add' || type === 'remove' || type === 'dose_change') {
    return type
  }
  return 'unknown'
}

/** True when this adjustment reason is shown to members (swap／add). */
export function adjustmentReasonIsMemberFacing(type: unknown): boolean {
  return type === 'swap' || type === 'add'
}

export function parseExcludedRows(snapshot: unknown): ExpertCaseExcludedRow[] {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.excluded)) {
    return []
  }
  const out: ExpertCaseExcludedRow[] = []
  for (const row of snapshot.excluded) {
    if (!isRecord(row) || typeof row.sellable_item_id !== 'string') {
      continue
    }
    out.push({
      sellable_item_id: row.sellable_item_id,
      reason_code: typeof row.reason_code === 'string' ? row.reason_code : '',
      name: typeof row.name === 'string' ? row.name : null
    })
  }
  return out
}

export function parseAdjustments(value: unknown): ExpertCaseAdjustment[] {
  if (!Array.isArray(value)) {
    return []
  }
  const out: ExpertCaseAdjustment[] = []
  for (const row of value) {
    if (!isRecord(row) || typeof row.package_plan_code !== 'string' || typeof row.type !== 'string') {
      continue
    }
    out.push({
      type: row.type,
      package_plan_code: row.package_plan_code,
      original_item: parseAdjustmentItem(row.original_item),
      new_item: parseAdjustmentItem(row.new_item),
      reason: typeof row.reason === 'string' ? row.reason : null,
      operator_id: typeof row.operator_id === 'string' ? row.operator_id : null,
      operator_display_name: typeof row.operator_display_name === 'string'
        ? row.operator_display_name
        : null,
      operator_role: typeof row.operator_role === 'string' ? row.operator_role : null,
      adjusted_at: typeof row.adjusted_at === 'string' ? row.adjusted_at : null
    })
  }
  return out
}

function parseAdjustmentItem(value: unknown): ExpertCaseAdjustmentItem | null {
  if (value == null) {
    return null
  }
  if (!isRecord(value) || typeof value.sellable_item_id !== 'string' || typeof value.name !== 'string') {
    return null
  }
  return {
    sellable_item_id: value.sellable_item_id,
    name: value.name,
    code: typeof value.code === 'string' ? value.code : null,
    daily_dose: typeof value.daily_dose === 'number' ? value.daily_dose : null
  }
}

export type ContributionKv = { key: string, value: string }

/** Flatten one contribution object (additionalProperties) into key/value rows for a table. */
export function contributionToRows(contribution: unknown): ContributionKv[] {
  if (!isRecord(contribution)) {
    return [{ key: 'value', value: formatContributionCell(contribution) }]
  }
  return Object.keys(contribution)
    .sort()
    .map(key => ({
      key,
      value: formatContributionCell(contribution[key])
    }))
}

export function formatContributionCell(value: unknown): string {
  if (value == null) {
    return '—'
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export type TopDomainRow = {
  domain_id: string
  name: string | null
  severity: number | null
}

export function parseTopDomains(summary: unknown): TopDomainRow[] {
  if (!isRecord(summary) || !Array.isArray(summary.top_domains)) {
    return []
  }
  const out: TopDomainRow[] = []
  for (const row of summary.top_domains) {
    if (!isRecord(row)) {
      continue
    }
    const domainId = typeof row.domain_id === 'string' ? row.domain_id : ''
    if (!domainId) {
      continue
    }
    out.push({
      domain_id: domainId,
      name: typeof row.name === 'string' ? row.name : null,
      severity: typeof row.severity === 'number' && Number.isFinite(row.severity)
        ? row.severity
        : null
    })
  }
  return out
}

export type PackageRationaleView = {
  package_plan_code: string
  package_plan_name: string | null
  headline: string | null
  body: string | null
  groups: Array<{ key: string, title: string, lines: string[] }>
}

export function parsePackageRationales(snapshot: unknown): PackageRationaleView[] {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.packages)) {
    return []
  }
  const out: PackageRationaleView[] = []
  for (const pkg of snapshot.packages) {
    if (!isRecord(pkg)) {
      continue
    }
    const code = typeof pkg.package_plan_code === 'string' ? pkg.package_plan_code : ''
    const rationale = isRecord(pkg.rationale) ? pkg.rationale : null
    if (!rationale) {
      continue
    }
    const groups: PackageRationaleView['groups'] = []
    if (Array.isArray(rationale.groups)) {
      for (const group of rationale.groups) {
        if (!isRecord(group)) {
          continue
        }
        const title = typeof group.title === 'string' ? group.title : ''
        const key = typeof group.key === 'string' ? group.key : title
        const lines: string[] = []
        if (Array.isArray(group.entries)) {
          for (const entry of group.entries) {
            if (!isRecord(entry)) {
              continue
            }
            if (typeof entry.line === 'string' && entry.line.trim()) {
              lines.push(entry.line.trim())
            } else if (typeof entry.ingredient_label === 'string' && typeof entry.name === 'string') {
              lines.push(`${entry.ingredient_label}：${entry.name}`)
            }
          }
        }
        if (title || lines.length) {
          groups.push({ key: key || `group-${groups.length}`, title, lines })
        }
      }
    }
    out.push({
      package_plan_code: code,
      package_plan_name: typeof pkg.package_plan_name === 'string' ? pkg.package_plan_name : null,
      headline: typeof rationale.headline === 'string' ? rationale.headline : null,
      body: typeof rationale.body === 'string' ? rationale.body : null,
      groups
    })
  }
  return out
}

export type ItemContributionBlock = {
  sellable_item_id: string
  name: string | null
  contributions: ContributionKv[][]
}

export function parseItemContributionBlocks(snapshot: unknown): ItemContributionBlock[] {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.packages)) {
    return []
  }
  const out: ItemContributionBlock[] = []
  for (const pkg of snapshot.packages) {
    if (!isRecord(pkg) || !Array.isArray(pkg.items)) {
      continue
    }
    for (const item of pkg.items) {
      if (!isRecord(item)) {
        continue
      }
      const explanation = isRecord(item.explanation) ? item.explanation : null
      const contributions = explanation && Array.isArray(explanation.contributions)
        ? explanation.contributions
        : []
      if (!contributions.length) {
        continue
      }
      const sellableId = typeof item.sellable_item_id === 'string' ? item.sellable_item_id : ''
      out.push({
        sellable_item_id: sellableId,
        name: typeof item.name === 'string'
          ? item.name
          : typeof item.code === 'string' ? item.code : null,
        contributions: contributions.map(contributionToRows)
      })
    }
  }
  return out
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
