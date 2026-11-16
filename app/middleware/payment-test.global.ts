import { hasAdminRole, operatorRoles } from '~/utils/operator-roles'

function isPaymentTestPath(path: string) {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  return stripped === '/payment-test' || stripped.startsWith('/payment-test/')
}

/** 金流測試僅 admin；expert／ops 導回總覽。 */
export default defineNuxtRouteMiddleware((to) => {
  if (!isPaymentTestPath(to.path)) {
    return
  }

  const session = useSessionStore()
  const localePath = useLocalePath()
  if (!hasAdminRole(operatorRoles(session.operator))) {
    return navigateTo(localePath('/'))
  }
})
