import type { Composer } from 'vue-i18n'
import { AdminApiError } from '~/utils/admin-api'

/** 舊 JWT 只有 `role`、或 token 失效 → core 回 401；前端一律導回登入。 */
export function isOperatorAuthFailure(error: unknown): boolean {
  return error instanceof AdminApiError && error.statusCode === 401
}

export async function redirectToLoginOnAuthFailure(error: unknown): Promise<boolean> {
  if (!isOperatorAuthFailure(error)) {
    return false
  }
  const session = useSessionStore()
  session.logout()
  const localePath = useLocalePath()
  await navigateTo({
    path: localePath('/login'),
    query: { reason: 'session_expired' }
  })
  return true
}

export function describeOperatorApiError(
  error: unknown,
  t: Composer['t']
): string {
  if (!(error instanceof AdminApiError)) {
    return t('operators.errors.generic')
  }
  if (error.statusCode === 401) {
    return t('operators.errors.sessionExpired')
  }
  if (error.statusCode === 403) {
    return t('operators.errors.forbidden')
  }
  if (error.statusCode === 404) {
    return t('operators.errors.notFound')
  }
  if (error.statusCode === 409) {
    if (error.code === 'cannot_modify_self') {
      return t('operators.errors.cannotModifySelf')
    }
    if (error.code === 'cannot_remove_last_admin') {
      return t('operators.errors.cannotRemoveLastAdmin')
    }
    if (error.code === 'conflict') {
      return t('operators.errors.emailConflict')
    }
    return t('operators.errors.conflict')
  }
  if (error.statusCode === 422) {
    return t('operators.errors.invalidRequest')
  }
  return t('operators.errors.generic')
}
