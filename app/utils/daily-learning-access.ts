import type { OperatorRole } from '~/types/operator'

/**
 * Align with candor-core weight-set / daily-learning x-required-roles
 * (ops confirm／confirm-safety pending H-core PR; generate／dry-run／publish stay expert｜admin).
 */
export const DAILY_LEARNING_GENERATE_ROLES = ['expert', 'admin'] as const satisfies readonly OperatorRole[]
export const DAILY_LEARNING_DRY_RUN_ROLES = ['expert', 'admin'] as const satisfies readonly OperatorRole[]
export const DAILY_LEARNING_PUBLISH_ROLES = ['expert', 'admin'] as const satisfies readonly OperatorRole[]
export const DAILY_LEARNING_CONFIRM_ROLES = ['expert', 'ops', 'admin'] as const satisfies readonly OperatorRole[]
export const WEIGHT_SET_READ_ROLES = ['expert', 'ops', 'admin'] as const satisfies readonly OperatorRole[]

export function roleAllowed(
  role: OperatorRole | null | undefined,
  allowed: readonly OperatorRole[]
): boolean {
  return role != null && allowed.includes(role)
}

export function canGenerateDailyLearningDraft(role: OperatorRole | null | undefined): boolean {
  return roleAllowed(role, DAILY_LEARNING_GENERATE_ROLES)
}

export function canDryRunWeightSet(role: OperatorRole | null | undefined): boolean {
  return roleAllowed(role, DAILY_LEARNING_DRY_RUN_ROLES)
}

export function canPublishWeightSet(role: OperatorRole | null | undefined): boolean {
  return roleAllowed(role, DAILY_LEARNING_PUBLISH_ROLES)
}

export function canConfirmDailyLearning(role: OperatorRole | null | undefined): boolean {
  return roleAllowed(role, DAILY_LEARNING_CONFIRM_ROLES)
}

export function canReadWeightSets(role: OperatorRole | null | undefined): boolean {
  return roleAllowed(role, WEIGHT_SET_READ_ROLES)
}
