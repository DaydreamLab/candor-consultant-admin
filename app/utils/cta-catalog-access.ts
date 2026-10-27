import type { OperatorRole } from '~/types/operator'

/** expert：錨點隱藏；ops：只讀可見；admin：可編 */
export function canViewCtaCatalog(role: OperatorRole | null | undefined): boolean {
  return role === 'admin' || role === 'ops'
}

export function canEditCtaCatalog(role: OperatorRole | null | undefined): boolean {
  return role === 'admin'
}
