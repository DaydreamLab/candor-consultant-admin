import type { OperatorRole } from '~/types/operator'

/** Core 正規化順序：admin → ops → expert */
export const OPERATOR_ROLE_ORDER = ['admin', 'ops', 'expert'] as const satisfies readonly OperatorRole[]

export function sortOperatorRoles(roles: readonly OperatorRole[]): OperatorRole[] {
  return [...roles].sort(
    (a, b) => OPERATOR_ROLE_ORDER.indexOf(a) - OPERATOR_ROLE_ORDER.indexOf(b)
  )
}
