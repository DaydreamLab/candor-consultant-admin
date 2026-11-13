/**
 * Consultation goal display labels.
 *
 * Codes／names align with candor-core `ConsultationGoal::defaultCatalog()`.
 * Reuses existing i18n under `expertStation.detail.profileCodes` (same catalog);
 * unknown codes fall back to the raw value.
 */

/** Same catalog keys as expert-station profile code labels. */
export const CONSULTATION_GOAL_I18N_PREFIX = 'expertStation.detail.profileCodes'

export type TranslateFn = (key: string) => string

/** Single goal code → localized label; unknown → raw. */
export function consultationGoalLabel(code: unknown, t: TranslateFn): string {
  const raw = String(code ?? '').trim()
  if (!raw) {
    return ''
  }
  const key = `${CONSULTATION_GOAL_I18N_PREFIX}.${raw}`
  const translated = t(key)
  return translated === key ? raw : translated
}

/** Join goals for list cells; empty／missing → `empty`. */
export function formatConsultationGoals(
  goals: unknown,
  t: TranslateFn,
  empty: string
): string {
  if (!Array.isArray(goals) || goals.length === 0) {
    return empty
  }
  const parts = goals
    .map(item => consultationGoalLabel(item, t))
    .filter(part => part.length > 0)
  return parts.length > 0 ? parts.join(', ') : empty
}
