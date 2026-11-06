import { hasAdminRole, operatorRoles } from '~/utils/operator-roles'

function isOperatorsPath(path: string) {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  return stripped === '/operators' || stripped.startsWith('/operators/')
}

/** 帳號管理僅 admin；expert／ops 導回總覽（core 403）。 */
export default defineNuxtRouteMiddleware((to) => {
  if (!isOperatorsPath(to.path)) {
    return
  }

  const session = useSessionStore()
  const localePath = useLocalePath()
  if (!hasAdminRole(operatorRoles(session.operator))) {
    return navigateTo(localePath('/'))
  }
})
