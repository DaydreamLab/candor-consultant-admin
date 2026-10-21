import { canAccessKnowledge, isKnowledgeAdminPath } from '~/utils/knowledge-access'

export default defineNuxtRouteMiddleware((to) => {
  if (!isKnowledgeAdminPath(to.path)) {
    return
  }

  const session = useSessionStore()
  const localePath = useLocalePath()
  if (!canAccessKnowledge(session.operator?.role)) {
    return navigateTo(localePath('/'))
  }
})
