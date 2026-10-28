import type { Role, SessionUser } from '~/types/admin'
import type { Operator, OperatorRole } from '~/types/operator'
import { AdminApiError, adminLogin, adminRefresh } from '~/utils/admin-api'
import {
  OPERATOR_TOKEN_KEY,
  clearOperatorSession,
  readOperatorToken,
  readStoredOperator,
  writeOperatorSession
} from '~/utils/operator-session'
import { shouldSlideSession } from '~/utils/session-slide'

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

  let slideInFlight: Promise<void> | null = null

  async function slideIfActive() {
    if (slideInFlight) {
      await slideInFlight
      return
    }
    const stored = readStoredOperator()
    const token = readOperatorToken()
    if (!stored || !token) {
      return
    }
    if (!shouldSlideSession({
      now: Date.now(),
      issuedAt: stored.issuedAt,
      expiresAt: stored.expiresAt
    })) {
      return
    }
    const remember = import.meta.client && window.localStorage.getItem(OPERATOR_TOKEN_KEY) != null
    slideInFlight = (async () => {
      try {
        const data = await adminRefresh(config.public.apiBase, token)
        if (readOperatorToken() !== token) {
          return
        }
        writeOperatorSession(data, remember)
        sync()
      } catch (error) {
        if (error instanceof AdminApiError && error.statusCode === 401) {
          if (readOperatorToken() === token) {
            logout()
          }
        }
      } finally {
        slideInFlight = null
      }
    })()
    await slideInFlight
  }

  sync()

  return {
    operator,
    session,
    isLoggedIn,
    role,
    sync,
    login,
    logout,
    slideIfActive
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
