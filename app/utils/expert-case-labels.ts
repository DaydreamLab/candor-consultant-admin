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

/** Known intake / gap field keys with i18n under expertCaseReviews.intake.* */
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
  'preference',
  // Candor user_profiles.intake gap keys (core snapshot bag)
  'diseases',
  'symptoms',
  'other_status',
  'incidents',
  'lab_report',
  'checkup',
  'blood_test',
  'exercise_habit',
  'exercise_detail',
  'supplement_habit',
  'supplement_detail',
  'has',
  'detail',
  'items',
  'list',
  'text',
  'value',
  'status',
  'type',
  'note'
])

/**
 * Engine meta / answer-wall keys — never show as expert-facing rows.
 * `answered` is a bool map of which gaps were filled, not member content.
 */
const INTAKE_META_KEYS = new Set([
  'answered',
  'checkup_suggested',
  'external'
])

/** Health-status keys folded into profile `conditions` when flattening raw intake. */
const INTAKE_HEALTH_KEYS = new Set(['diseases', 'symptoms'])

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

function intakeFieldLabel(key: string, t: Translate): { label: string, title: string | null } {
  if (INTAKE_FIELD_KEYS.has(key)) {
    return { label: t(`expertCaseReviews.intake.${key}`), title: null }
  }
  if (looksLikeLocalizedText(key)) {
    return { label: key, title: null }
  }
  // Prefer a single generic 「內容」over flooding the UI with 「其他」
  return {
    label: t('expertCaseReviews.intake.detail'),
    title: key
  }
}

function formatEmpty(t: Translate): string {
  return t('expertCaseReviews.intakeEmpty')
}

function formatNone(t: Translate): string {
  return t('expertCaseReviews.intakeNone')
}

function formatYesNo(value: boolean, t: Translate): string {
  return value ? t('expertCaseReviews.yes') : t('expertCaseReviews.no')
}

/** Human-readable scalar / nested intake values (no raw true/false / English walls). */
export function formatIntakeValue(value: unknown, t: Translate): string {
  if (value == null || value === '') {
    return formatEmpty(t)
  }
  if (typeof value === 'boolean') {
    return formatYesNo(value, t)
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === 'none' || trimmed === 'null' || trimmed === 'undefined') {
      return formatNone(t)
    }
    if (trimmed === 'true' || trimmed === 'false') {
      return formatYesNo(trimmed === 'true', t)
    }
    if (looksLikeLocalizedText(trimmed) || !/^[a-z][a-z0-9_]{0,64}$/i.test(trimmed)) {
      return trimmed
    }
    // Known enum-ish codes: try condition / goal / diet / intake labels
    if (CONDITION_KEYS.has(trimmed)) {
      return conditionLabel(trimmed, t).text
    }
    if (GOAL_KEYS.has(trimmed)) {
      return goalLabel(trimmed, t).text
    }
    if (DIET_KEYS.has(trimmed)) {
      return dietLabel(trimmed, t).text
    }
    if (INTAKE_FIELD_KEYS.has(trimmed)) {
      return t(`expertCaseReviews.intake.${trimmed}`)
    }
    // Value codes without a map: keep readable text (not true/false / key walls)
    return trimmed
  }
  if (Array.isArray(value)) {
    const parts = value
      .map(item => formatIntakeValue(item, t))
      .filter(part => part && part !== formatEmpty(t))
    return parts.length ? parts.join('、') : formatEmpty(t)
  }
  if (isRecord(value)) {
    // `{ has: false }` / empty gap → 無
    if (Object.prototype.hasOwnProperty.call(value, 'has') && value.has === false) {
      return formatNone(t)
    }
    if (Object.prototype.hasOwnProperty.call(value, 'has') && value.has === true) {
      const rest = { ...value }
      delete rest.has
      if (!Object.keys(rest).length) {
        return formatYesNo(true, t)
      }
      return formatIntakeValue(rest, t)
    }
    const parts = Object.keys(value)
      .sort()
      .filter(key => !INTAKE_META_KEYS.has(key))
      .map((nestedKey) => {
        const nestedLabel = intakeFieldLabel(nestedKey, t).label
        return `${nestedLabel}：${formatIntakeValue(value[nestedKey], t)}`
      })
    return parts.length ? parts.join('；') : formatEmpty(t)
  }
  try {
    return String(value)
  } catch {
    return formatEmpty(t)
  }
}

/**
 * Collect diseases / symptoms (and related free text) for the「健康狀況」row.
 * Prefer localized free text; skip empty / none / {has:false}.
 */
export function formatHealthStatusFromIntake(intake: unknown, t: Translate): string | null {
  if (!isRecord(intake)) {
    return null
  }
  const parts: string[] = []
  for (const key of ['diseases', 'symptoms', 'other_status', 'incidents'] as const) {
    if (!(key in intake)) {
      continue
    }
    const raw = intake[key]
    const text = formatIntakeValue(raw, t)
    if (!text || text === formatEmpty(t) || text === formatNone(t)) {
      continue
    }
    const label = intakeFieldLabel(key, t).label
    parts.push(`${label}：${text}`)
  }
  return parts.length ? parts.join('；') : null
}

/**
 * Merge top-level `conditions` codes with intake diseases／symptoms for display.
 */
export function formatConditionsDisplay(
  conditions: unknown,
  intake: unknown,
  t: Translate
): { text: string, title: string | null } {
  const fromCodes = Array.isArray(conditions)
    ? joinLabeledList(conditions, item => conditionLabel(item, t))
    : { text: '—', title: null as string | null }
  const fromIntake = formatHealthStatusFromIntake(intake, t)
  if (fromCodes.text === '—' && !fromIntake) {
    return { text: '—', title: null }
  }
  if (fromCodes.text === '—') {
    return { text: fromIntake!, title: null }
  }
  if (!fromIntake) {
    return fromCodes
  }
  return {
    text: `${fromCodes.text}；${fromIntake}`,
    title: fromCodes.title
  }
}

/**
 * Flatten intake object into readable labeled rows.
 * Never dump JSON.stringify of the whole bag into the main UI.
 * Skips meta keys and health keys already folded into「健康狀況」when `omitHealthKeys`.
 */
export function formatIntakeRows(
  intake: unknown,
  t: Translate,
  options: { omitHealthKeys?: boolean } = {}
): IntakeDisplayRow[] {
  if (intake == null || intake === '') {
    return []
  }
  if (!isRecord(intake)) {
    return [{
      key: 'value',
      label: t('expertCaseReviews.intake.value'),
      value: formatIntakeValue(intake, t),
      title: null
    }]
  }
  const omitHealth = options.omitHealthKeys !== false
  const keys = Object.keys(intake).sort()
  const rows: IntakeDisplayRow[] = []
  for (const key of keys) {
    if (INTAKE_META_KEYS.has(key)) {
      continue
    }
    if (omitHealth && INTAKE_HEALTH_KEYS.has(key)) {
      continue
    }
    const rawValue = intake[key]
    // Skip empty / none-only rows to reduce 「其他：—」noise
    const valueText = formatIntakeValue(rawValue, t)
    if (valueText === formatEmpty(t)) {
      continue
    }
    const { label, title } = intakeFieldLabel(key, t)
    rows.push({ key, label, value: valueText, title })
  }
  return rows
}

export type ExpertProfileSectionView = {
  id: string
  title: string
  rows: Array<{ key: string, label: string, value: string, title: string | null }>
}

/**
 * Prefer core `display_profile` sections; else build zh rows from snapshot
 * (conditions ← diseases／symptoms; intake without meta／health keys).
 */
export function resolveExpertProfileSections(
  profile: unknown,
  t: Translate
): ExpertProfileSectionView[] {
  if (isRecord(profile)) {
    const display = profile.display_profile
    if (isRecord(display) && Array.isArray(display.sections) && display.sections.length) {
      const sections: ExpertProfileSectionView[] = []
      for (const raw of display.sections) {
        if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title_zh !== 'string') {
          continue
        }
        const rows: ExpertProfileSectionView['rows'] = []
        if (Array.isArray(raw.rows)) {
          for (let i = 0; i < raw.rows.length; i += 1) {
            const row = raw.rows[i]
            if (!isRecord(row) || typeof row.label_zh !== 'string' || typeof row.value_zh !== 'string') {
              continue
            }
            rows.push({
              key: `${raw.id}-${i}`,
              label: row.label_zh,
              value: row.value_zh.trim() ? row.value_zh : '—',
              title: null
            })
          }
        }
        sections.push({
          id: raw.id,
          title: raw.title_zh,
          rows: rows.length
            ? rows
            : [{ key: `${raw.id}-empty`, label: raw.title_zh, value: '—', title: null }]
        })
      }
      if (sections.length) {
        return sections
      }
    }
  }

  const snapshot = isRecord(profile) && isRecord(profile.snapshot)
    ? profile.snapshot
    : isRecord(profile)
      ? profile
      : null
  if (!snapshot) {
    return []
  }

  const preferred = [
    'sex',
    'age_years',
    'height_cm',
    'weight_kg',
    'diet',
    'goals',
    'conditions',
    'intake'
  ] as const

  const sections: ExpertProfileSectionView[] = []
  for (const key of preferred) {
    if (!(key in snapshot)) {
      continue
    }
    const field = profileFieldDisplayLabel(key, t)
    const value = snapshot[key]

    if (key === 'intake') {
      const intakeRows = formatIntakeRows(value, t, { omitHealthKeys: true })
      sections.push({
        id: key,
        title: field.text,
        rows: intakeRows.length
          ? intakeRows.map(row => ({
              key: row.key,
              label: row.label,
              value: row.value,
              title: row.title
            }))
          : [{ key: 'empty', label: field.text, value: '—', title: null }]
      })
      continue
    }

    let text: string
    let title: string | null = null
    if (key === 'sex') {
      const labeled = sexLabel(value, t)
      text = labeled.text
      title = labeled.title
    } else if (key === 'diet') {
      const labeled = dietLabel(value, t)
      text = labeled.text
      title = labeled.title
    } else if (key === 'goals' && Array.isArray(value)) {
      const joined = joinLabeledList(value, item => goalLabel(item, t))
      text = joined.text
      title = joined.title
    } else if (key === 'conditions') {
      const joined = formatConditionsDisplay(value, snapshot.intake, t)
      text = joined.text
      title = joined.title
    } else if (value == null || value === '') {
      text = '—'
    } else if (Array.isArray(value)) {
      text = value.map(item => String(item)).join('、') || '—'
    } else {
      text = String(value)
    }

    sections.push({
      id: key,
      title: field.text,
      rows: [{ key, label: field.text, value: text, title }]
    })
  }
  return sections
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
