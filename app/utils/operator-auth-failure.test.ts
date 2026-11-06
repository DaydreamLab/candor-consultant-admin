import { describe, expect, it } from 'vitest'
import { AdminApiError } from './admin-api'
import {
  describeOperatorApiError,
  isOperatorAuthFailure
} from './operator-auth-failure'

const t = ((key: string) => key) as (key: string) => string

describe('operator-auth-failure', () => {
  it('detects 401 as auth failure', () => {
    expect(isOperatorAuthFailure(new AdminApiError(401, 'gone'))).toBe(true)
    expect(isOperatorAuthFailure(new AdminApiError(403, 'no'))).toBe(false)
  })

  it('maps 409 codes and 422 to Chinese i18n keys', () => {
    expect(describeOperatorApiError(
      new AdminApiError(409, '', 'cannot_modify_self'),
      t
    )).toBe('operators.errors.cannotModifySelf')
    expect(describeOperatorApiError(
      new AdminApiError(409, '', 'cannot_remove_last_admin'),
      t
    )).toBe('operators.errors.cannotRemoveLastAdmin')
    expect(describeOperatorApiError(
      new AdminApiError(409, '', 'conflict'),
      t
    )).toBe('operators.errors.emailConflict')
    expect(describeOperatorApiError(
      new AdminApiError(422, '', 'invalid_request'),
      t
    )).toBe('operators.errors.invalidRequest')
    expect(describeOperatorApiError(
      new AdminApiError(403, ''),
      t
    )).toBe('operators.errors.forbidden')
  })
})
