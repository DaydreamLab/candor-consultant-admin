import type { OperatorRole } from '~/types/operator'

/** ops：只讀可見；admin：可編；expert：隱藏側欄／路由。 */
export function canViewExpertBookingProduct(role: OperatorRole | null | undefined): boolean {
  return role === 'admin' || role === 'ops'
}

export function canEditExpertBookingProduct(role: OperatorRole | null | undefined): boolean {
  return role === 'admin'
}
