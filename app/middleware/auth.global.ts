export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore()
  const localePath = useLocalePath()
  const isLogin = to.path === '/login' || to.path === '/en/login'

  if (!session.isLoggedIn && !isLogin) {
    return navigateTo(localePath('/login'))
  }

  if (session.isLoggedIn && isLogin) {
    return navigateTo(localePath('/'))
  }
})
