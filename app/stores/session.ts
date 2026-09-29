import type { Role, SessionUser } from '~/types/admin'
import type { Operator, OperatorRole } from '~/types/operator'
import { adminLogin } from '~/utils/admin-api'
import {
  clearOperatorSession,
  readStoredOperator,
  writeOperatorSession
} from '~/utils/operator-session'

export const useSessionStore = defineStore('session', () => {
  const config = useRuntimeConfig()
  const legacySession = useCookie<null>('candor-admin-session')
  legacySession.value = null

  const operator = ref<Operator | null>(null)
  const session = ref<SessionUser | null>(null)

  const isLoggedIn = computed(() => Boolean(operator.value))
  const role = computed(() => session.value?.role ?? null)

  function sync() {
    const stored = readStoredOperator()
    operator.value = stored?.operator ?? null
    session.value = stored ? toDemoSession(stored.operator) : null
  }

  async function login(email: string, password: string, rememberMe: boolean = false) {
    const data = await adminLogin(config.public.apiBase, email, password, rememberMe)
    writeOperatorSession(data, rememberMe)
    sync()
  }

  function logout() {
    clearOperatorSession()
    operator.value = null
    session.value = null
  }

  sync()

  return {
    operator,
    session,
    isLoggedIn,
    role,
    sync,
    login,
    logout
  }
})

function toDemoSession(operator: Operator): SessionUser {
  return {
    id: operator.id,
    email: operator.email,
    name: operator.name,
    role: demoRole(operator.role),
    orgId: null,
    orgName: null
  }
}

function demoRole(role: OperatorRole): Role {
  if (role === 'admin') {
    return 'consultant_admin'
  }
  return 'consultant_ops'
}
