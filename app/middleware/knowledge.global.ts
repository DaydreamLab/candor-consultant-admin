import { isKnowledgePathBlockedForExpert, normalizeAdminPath } from '~/utils/nav'

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore()
  const localePath = useLocalePath()
  const path = normalizeAdminPath(to.path)

  if (!isKnowledgePathBlockedForExpert(path)) {
    return
  }

  if (session.operator?.role === 'expert') {
    return navigateTo(localePath('/'))
  }
})
