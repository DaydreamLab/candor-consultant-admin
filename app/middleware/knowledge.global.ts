import { canAccessKnowledge, isKnowledgeAdminPath } from '~/utils/knowledge-access'
import { operatorRoles } from '~/utils/operator-roles'

export default defineNuxtRouteMiddleware((to) => {
  if (!isKnowledgeAdminPath(to.path)) {
    return
  }

  const session = useSessionStore()
  const localePath = useLocalePath()
  if (!canAccessKnowledge(operatorRoles(session.operator))) {
    return navigateTo(localePath('/'))
  }
})
