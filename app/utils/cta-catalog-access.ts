import type { OperatorRole } from '~/types/operator'
import { hasAdminRole, hasOpsAdminRole } from '~/utils/operator-roles'

/** expert only：錨點隱藏；ops：只讀可見；admin：可編 */
export function canViewCtaCatalog(roles: readonly OperatorRole[] | null | undefined): boolean {
  return hasOpsAdminRole(roles ?? [])
}

export function canEditCtaCatalog(roles: readonly OperatorRole[] | null | undefined): boolean {
  return hasAdminRole(roles ?? [])
}
