/**
 * Chinese / i18n display labels for expert-case-reviews enums.
 * Main UI never shows raw English / snake_case; unknown →「其他」+ tooltip raw.
 */

import { isRecord } from './expert-case-display'

export type LabeledText = {
  /** Visible label (never raw code for unknown enums). */
  text: string
  /** Tooltip / title when unknown or for ops reconciliation; null when not needed. */
  title: string | null
  known: boolean
}

export type IntakeDisplayRow = {
  key: string
  label: string
  value: string
  title: string | null
}

type Translate = (key: string, params?: Record<string, unknown>) => string

const DECISION_KEYS = new Set(['approve', 'reject', 'adjust'])

const REPORT_STATUS_KEYS = new Set([
  'completed',
  'ready',
  'pending',
  'processing',
  'failed'
])

const DIET_KEYS = new Set([
  'omnivore',
  'vegetarian',
  'vegan',
  'pescatarian',
  'flexitarian'
])

/** Profile conditions + contraindication_<condition> suffix codes. */
const CONDITION_KEYS = new Set([
  'pregnancy',
  'breastfeeding',
  'kidney_disease',
  'liver_disease'
])

/** Goals seen in expert-tuning mocks / design examples. */
const GOAL_KEYS = new Set([
  'sleep',
  'energy',
  'immunity',
  'stress',
  'weight',
  'muscle',
  'skin',
  'joint',
  'gut',
  'focus',
  'mood',
  'digestion',
  'heart',
  'bone',
  'hormone'
])

const CLASSIFICATION_KEYS = new Set(['reusable', 'personal_risk', 'pending'])

const PLAN_KEYS = new Set(['basic', 'mid', 'premium'])

const OPERATOR_ROLE_KEYS = new Set([
  'admin',
  'ops',
  'expert',
  'consultant_admin',
  'consultant_ops',
  'platform_assist',
  'platform_viewer'
])

const INTAKE_FIELD_KEYS = new Set([
  'meals_per_day',
  'water_liters',
  'alcohol',
  'caffeine',
  'smoking',
  'exercise',
  'sleep_hours',
  'supplements',
  'allergies',
  'medications',
  'notes',
  'frequency',
  'portion',
  'preference'
])

/** True when value looks like localized free text (not a snake_case code). */
export function looksLikeLocalizedText(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return true
  }
  // Allow short Latin free phrases without underscore codes
  if (!/^[a-z][a-z0-9_]{0,64}$/i.test(trimmed) && /\s/.test(trimmed)) {
    return true
  }
  return false
}

function otherLabel(t: Translate, raw: string): LabeledText {
  return {
    text: t('expertCaseReviews.other'),
    title: raw || null,
    known: false
  }
}

function knownLabel(t: Translate, i18nKey: string, _raw: string): LabeledText {
  return {
    text: t(i18nKey),
    title: null,
    known: true
  }
}

export function decisionLabel(value: unknown, t: Translate): LabeledText | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const raw = value.trim()
  if (DECISION_KEYS.has(raw)) {
    return knownLabel(t, `expertCaseReviews.decision.${raw}`, raw)
  }
  return otherLabel(t, raw)
}

export function operatorRoleLabel(value: unknown, t: Translate): LabeledText | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const raw = value.trim()
  if (OPERATOR_ROLE_KEYS.has(raw)) {
    // Prefer shared roles.* so demo + core role names stay aligned
    return knownLabel(t, `roles.${raw}`, raw)
  }
  return otherLabel(t, raw)
}

export function reportResultStatusLabel(value: unknown, t: Translate): LabeledText {
  if (typeof value !== 'string' || !value.trim()) {
    return otherLabel(t, String(value ?? ''))
  }
  const raw = value.trim()
  if (REPORT_STATUS_KEYS.has(raw)) {
    return knownLabel(t, `expertCaseReviews.reportResultStatus.${raw}`, raw)
  }
  return otherLabel(t, raw)
}

export function dietLabel(value: unknown, t: Translate): LabeledText {
  if (value == null || value === '') {
    return { text: '—', title: null, known: true }
  }
  const raw = String(value).trim()
  if (DIET_KEYS.has(raw)) {
    return knownLabel(t, `expertCaseReviews.diet.${raw}`, raw)
  }
  if (looksLikeLocalizedText(raw)) {
    return { text: raw, title: null, known: true }
  }
  return otherLabel(t, raw)
}

export function conditionLabel(value: unknown, t: Translate): LabeledText {
  if (value == null || value === '') {
    return { text: '—', title: null, known: true }
  }
  const raw = String(value).trim()
  if (CONDITION_KEYS.has(raw)) {
    return knownLabel(t, `expertCaseReviews.condition.${raw}`, raw)
  }
  if (looksLikeLocalizedText(raw)) {
    return { text: raw, title: null, known: true }
  }
  return otherLabel(t, raw)
}

export function goalLabel(value: unknown, t: Translate): LabeledText {
  if (value == null || value === '') {
    return { text: '—', title: null, known: true }
  }
  const raw = String(value).trim()
  if (GOAL_KEYS.has(raw)) {
    return knownLabel(t, `expertCaseReviews.goal.${raw}`, raw)
  }
  if (looksLikeLocalizedText(raw)) {
    return { text: raw, title: null, known: true }
  }
  return otherLabel(t, raw)
}

export function classificationLabel(value: unknown, t: Translate): LabeledText {
  if (typeof value !== 'string' || !value.trim()) {
    return otherLabel(t, String(value ?? ''))
  }
  const raw = value.trim()
  if (CLASSIFICATION_KEYS.has(raw)) {
    return knownLabel(t, `expertCaseReviews.classification.${raw}`, raw)
  }
  return otherLabel(t, raw)
}

export function packagePlanCodeLabel(
  code: unknown,
  name: unknown,
  t: Translate
): LabeledText {
  if (typeof name === 'string' && name.trim()) {
    return { text: name.trim(), title: null, known: true }
  }
  if (typeof code !== 'string' || !code.trim()) {
    return { text: '—', title: null, known: true }
  }
  const raw = code.trim()
  if (PLAN_KEYS.has(raw)) {
    return knownLabel(t, `plan.${raw}`, raw)
  }
  return otherLabel(t, raw)
}

export function sexLabel(value: unknown, t: Translate): LabeledText {
  if (value === 'M' || value === 'm') {
    return knownLabel(t, 'expertCaseReviews.sexMale', String(value))
  }
  if (value === 'F' || value === 'f') {
    return knownLabel(t, 'expertCaseReviews.sexFemale', String(value))
  }
  if (value == null || value === '') {
    return { text: '—', title: null, known: true }
  }
  const raw = String(value)
  if (looksLikeLocalizedText(raw)) {
    return { text: raw, title: null, known: true }
  }
  return otherLabel(t, raw)
}

export function caseStatusLabel(value: unknown, t: Translate): LabeledText {
  if (value === 'awaiting_review') {
    return knownLabel(t, 'expertCaseReviews.statusAwaiting', 'awaiting_review')
  }
  if (value === 'reviewed') {
    return knownLabel(t, 'expertCaseReviews.statusReviewed', 'reviewed')
  }
  if (value == null || value === '') {
    return { text: '—', title: null, known: true }
  }
  return otherLabel(t, String(value))
}

export function tierDisplayLabel(value: unknown, t: Translate): LabeledText {
  if (value === 'primary') {
    return knownLabel(t, 'expertCaseReviews.tierPrimary', 'primary')
  }
  if (value === 'secondary') {
    return knownLabel(t, 'expertCaseReviews.tierSecondary', 'secondary')
  }
  if (value == null || value === '') {
    return { text: '—', title: null, known: true }
  }
  return otherLabel(t, String(value))
}

export function adjustmentTypeDisplayLabel(value: unknown, t: Translate): LabeledText {
  if (value === 'swap' || value === 'add' || value === 'remove' || value === 'dose_change') {
    return knownLabel(t, `expertCaseReviews.adjustmentType.${value}`, String(value))
  }
  if (value == null || value === '') {
    return { text: '—', title: null, known: true }
  }
  return otherLabel(t, String(value))
}

export function profileFieldDisplayLabel(field: string, t: Translate): LabeledText {
  const known = [
    'sex',
    'age_years',
    'height_cm',
    'weight_kg',
    'diet',
    'goals',
    'conditions',
    'intake'
  ]
  if (known.includes(field)) {
    return knownLabel(t, `expertCaseReviews.profileField.${field}`, field)
  }
  return otherLabel(t, field)
}

export function displayNameOrUntitled(
  name: unknown,
  id: unknown,
  t: Translate
): LabeledText {
  if (typeof name === 'string' && name.trim()) {
    return { text: name.trim(), title: null, known: true }
  }
  const rawId = typeof id === 'string' && id.trim() ? id.trim() : null
  return {
    text: t('expertCaseReviews.unnamed'),
    title: rawId,
    known: false
  }
}

/** Prefer item name; bare SKU/code is shown as mono text (not treated as status enum). */
export function itemDisplayName(item: {
  name?: unknown
  code?: unknown
  sellable_item_id?: unknown
}, t: Translate): LabeledText {
  if (typeof item.name === 'string' && item.name.trim()) {
    return { text: item.name.trim(), title: null, known: true }
  }
  if (typeof item.code === 'string' && item.code.trim()) {
    return { text: item.code.trim(), title: null, known: true }
  }
  return displayNameOrUntitled(null, item.sellable_item_id, t)
}

function formatScalar(value: unknown): string {
  if (value == null || value === '') {
    return '—'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(item => formatScalar(item)).filter(Boolean).join('、') || '—'
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Flatten intake object into readable labeled rows.
 * Never dump JSON.stringify of the whole bag into the main UI.
 */
export function formatIntakeRows(intake: unknown, t: Translate): IntakeDisplayRow[] {
  if (intake == null || intake === '') {
    return []
  }
  if (!isRecord(intake)) {
    return [{
      key: 'value',
      label: t('expertCaseReviews.intake.value'),
      value: formatScalar(intake),
      title: null
    }]
  }
  const keys = Object.keys(intake).sort()
  const rows: IntakeDisplayRow[] = []
  for (const key of keys) {
    const rawValue = intake[key]
    let label: string
    let title: string | null = null
    if (INTAKE_FIELD_KEYS.has(key)) {
      label = t(`expertCaseReviews.intake.${key}`)
    } else if (looksLikeLocalizedText(key)) {
      label = key
    } else {
      label = t('expertCaseReviews.other')
      title = key
    }
    let valueText: string
    if (isRecord(rawValue)) {
      // Nested object: readable key=value pairs, not a JSON wall
      valueText = Object.keys(rawValue)
        .sort()
        .map((nestedKey) => {
          const nestedLabel = INTAKE_FIELD_KEYS.has(nestedKey)
            ? t(`expertCaseReviews.intake.${nestedKey}`)
            : looksLikeLocalizedText(nestedKey)
              ? nestedKey
              : nestedKey
          return `${nestedLabel}：${formatScalar(rawValue[nestedKey])}`
        })
        .join('；') || '—'
    } else {
      valueText = formatScalar(rawValue)
    }
    rows.push({ key, label, value: valueText, title })
  }
  return rows
}

/** Abbreviate conversation / UUID for header (first 8 chars). */
export function shortConversationId(value: unknown, head = 8): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '—'
  }
  const id = value.trim()
  if (id.length <= head) {
    return id
  }
  return `${id.slice(0, head)}…`
}

export function joinLabeledList(values: unknown[], mapOne: (v: unknown) => LabeledText): {
  text: string
  title: string | null
} {
  if (!values.length) {
    return { text: '—', title: null }
  }
  const parts = values.map(mapOne)
  const text = parts.map(part => part.text).join('、')
  const unknownRaws = parts.filter(part => !part.known && part.title).map(part => part.title!)
  return {
    text: text || '—',
    title: unknownRaws.length ? unknownRaws.join('、') : null
  }
}
