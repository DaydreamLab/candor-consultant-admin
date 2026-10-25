import { writeOperatorSession } from '~/utils/operator-session'

/**
 * When `NUXT_PUBLIC_PRIVACY_POLICY_MOCK=1`, seed an ops operator session so
 * `/settings` privacy UI can be screenshotted without a live core login.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (!config.public.privacyPolicyMock) {
    return
  }
  writeOperatorSession({
    token: 'privacy-policy-mock-token',
    expires_in: 60 * 60 * 24,
    operator: {
      id: 'op-mock-privacy',
      role: 'ops',
      email: 'ops-mock@candor.local',
      name: 'Mock Ops',
      status: 'active',
      last_login_at: new Date().toISOString()
    }
  }, true)
  useSessionStore().sync()
})
