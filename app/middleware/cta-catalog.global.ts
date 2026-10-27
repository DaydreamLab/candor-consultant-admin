import { canViewCtaCatalog } from '~/utils/cta-catalog-access'

function isCtaCatalogPath(path: string) {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  return stripped === '/settings/cta-catalog' || stripped.startsWith('/settings/cta-catalog/')
}

export default defineNuxtRouteMiddleware((to) => {
  if (!isCtaCatalogPath(to.path)) {
    return
  }

  const session = useSessionStore()
  const localePath = useLocalePath()
  if (!canViewCtaCatalog(session.operator?.role)) {
    return navigateTo(localePath('/settings'))
  }
})
