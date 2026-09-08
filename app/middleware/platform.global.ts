import { isPlatformRole } from '~/types/admin'

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore()
  const localePath = useLocalePath()
  const path = to.path.replace(/^\/en/, '') || '/'

  if (path === '/orgs' || path.startsWith('/orgs/')) {
    const role = session.role
    if (role && !isPlatformRole(role)) {
      return navigateTo(localePath('/'))
    }
  }
})
