import type { OperatorRole } from '~/types/operator'
import { hasAdminRole, hasOpsAdminRole } from '~/utils/operator-roles'

/** ops：只讀可見；admin：可編；expert only：隱藏側欄／路由。 */
export function canViewExpertBookingProduct(roles: readonly OperatorRole[] | null | undefined): boolean {
  return hasOpsAdminRole(roles ?? [])
}

export function canEditExpertBookingProduct(roles: readonly OperatorRole[] | null | undefined): boolean {
  return hasAdminRole(roles ?? [])
}
