import type { SessionUser } from '~/types/admin'
import { DEMO_STAFF, staffToSession } from '~/utils/demo'

export const useSessionStore = defineStore('session', () => {
  const cookie = useCookie<SessionUser | null>('candor-admin-session', {
    default: () => null,
    sameSite: 'lax'
  })

  const session = ref<SessionUser | null>(hydrate(cookie.value))

  const isLoggedIn = computed(() => Boolean(session.value))
  const role = computed(() => session.value?.role ?? null)

  function loginAs(staffId: string) {
    const staff = DEMO_STAFF.find(row => row.id === staffId)
    if (!staff) {
      return
    }
    const user = staffToSession(staff)
    session.value = user
    cookie.value = user
  }

  function logout() {
    session.value = null
    cookie.value = null
  }

  return {
    session,
    isLoggedIn,
    role,
    loginAs,
    logout
  }
})

function hydrate(value: SessionUser | null) {
  if (!value?.id) {
    return null
  }
  const staff = DEMO_STAFF.find(row => row.id === value.id)
  return staff ? staffToSession(staff) : null
}
