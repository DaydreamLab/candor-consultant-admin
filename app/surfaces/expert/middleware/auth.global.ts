function isPublicPath(path: string) {
  return path === '/login' || path === '/en/login'
}

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore()
  session.sync()
  const localePath = useLocalePath()
  const isLogin = to.path === '/login' || to.path === '/en/login'
  const isPublic = isPublicPath(to.path)

  if (!session.isLoggedIn && !isPublic) {
    return navigateTo(localePath('/login'))
  }

  if (session.isLoggedIn && session.operator?.role !== 'expert') {
    session.logout()
    return navigateTo({
      path: localePath('/login'),
      query: { reason: 'expert_only' }
    })
  }

  if (session.isLoggedIn && isLogin) {
    return navigateTo(localePath('/'))
  }
})
