import { canViewCtaCatalog } from '~/utils/cta-catalog-access'
import { operatorRoles } from '~/utils/operator-roles'

function isCtaCatalogPath(path: string) {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  return stripped === '/settings/guidance' || stripped.startsWith('/settings/guidance/')
}

export default defineNuxtRouteMiddleware((to) => {
  if (!isCtaCatalogPath(to.path)) {
    return
  }

  const session = useSessionStore()
  const localePath = useLocalePath()
  if (!canViewCtaCatalog(operatorRoles(session.operator))) {
    return navigateTo(localePath('/settings'))
  }
})
