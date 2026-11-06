import {
  canAccessAdminConsole,
  canAccessExpertStation,
  isAdminConsolePath,
  isExpertStationPath,
  isPublicAppPath,
  legacyExpertBookmarkRedirect,
  operatorRoles,
  postLoginHomePath
} from '~/utils/operator-roles'

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore()
  session.sync()
  const localePath = useLocalePath()
  const roles = operatorRoles(session.operator)
  const isLogin = normalizeLogin(to.path)
  const isPublic = isPublicAppPath(to.path)

  const legacy = legacyExpertBookmarkRedirect(to.path)
  if (legacy) {
    return navigateTo(localePath(legacy), { redirectCode: 301 })
  }

  if (!session.isLoggedIn && !isPublic) {
    return navigateTo(localePath('/login'))
  }

  if (session.isLoggedIn && isLogin) {
    return navigateTo(localePath(postLoginHomePath(roles)))
  }

  if (!session.isLoggedIn) {
    return
  }

  if (isExpertStationPath(to.path) && !canAccessExpertStation(roles)) {
    return navigateTo(localePath(postLoginHomePath(roles)))
  }

  if (isAdminConsolePath(to.path) && !canAccessAdminConsole(roles)) {
    return navigateTo(localePath(postLoginHomePath(roles)))
  }
})

function normalizeLogin(path: string) {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  return stripped === '/login'
}
