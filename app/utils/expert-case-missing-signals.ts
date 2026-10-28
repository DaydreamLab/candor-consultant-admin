/**
 * Soft signals for expert case review: missing goals / health report.
 * Used for warning chips only — never gate generate / submit / finalize.
 *
 * Derives from member-data `goals` and `health_report` (no dedicated API flags yet).
 */

import { isRecord } from '~/utils/expert-case-display'

export type ExpertCaseMissingSignals = {
  missingGoals: boolean
  missingReport: boolean
}

/** True when member-data has at least one non-empty string goal. */
export function expertCaseHasGoals(memberData: unknown): boolean {
  if (!isRecord(memberData)) {
    return false
  }
  const goals = memberData.goals
  if (!Array.isArray(goals)) {
    return false
  }
  return goals.some(goal => typeof goal === 'string' && goal.trim().length > 0)
}

/** True when member-data has a bound health_report object. */
export function expertCaseHasHealthReport(memberData: unknown): boolean {
  if (!isRecord(memberData)) {
    return false
  }
  return isRecord(memberData.health_report)
}

/**
 * When member-data is loaded, return missing flags.
 * Returns null when member-data is not available yet (loading / error / unset).
 */
export function expertCaseMissingSignals(
  memberData: unknown | null | undefined
): ExpertCaseMissingSignals | null {
  if (memberData == null || !isRecord(memberData)) {
    return null
  }
  return {
    missingGoals: !expertCaseHasGoals(memberData),
    missingReport: !expertCaseHasHealthReport(memberData)
  }
}
