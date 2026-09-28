import type { Operator, OperatorLoginData, OperatorRole } from '~/types/operator'

export const OPERATOR_TOKEN_KEY = 'candor.operator.token'

const PROFILE_KEY = 'candor.operator.profile'

const ROLES = new Set<OperatorRole>(['expert', 'ops', 'admin'])

export interface StoredOperator {
  operator: Operator
  expiresAt: number
}

function storage() {
  if (!import.meta.client) {
    return null
  }
  return window.localStorage
}

export function readOperatorToken() {
  return storage()?.getItem(OPERATOR_TOKEN_KEY) ?? null
}

export function readStoredOperator(): StoredOperator | null {
  const store = storage()
  if (!store) {
    return null
  }
  const parsed = parseProfile(store.getItem(PROFILE_KEY))
  const token = store.getItem(OPERATOR_TOKEN_KEY)
  if (!parsed || !token) {
    clearOperatorSession()
    return null
  }
  return parsed
}

export function writeOperatorSession(data: OperatorLoginData) {
  const store = storage()
  if (!store) {
    return
  }
  const operator = normalizeOperator(data.operator)
  const expiresAt = Date.now() + data.expires_in * 1000
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error('operator session expiry is invalid')
  }
  const profile: StoredOperator = { operator, expiresAt }
  store.setItem(OPERATOR_TOKEN_KEY, data.token)
  store.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function clearOperatorSession() {
  const store = storage()
  if (!store) {
    return
  }
  store.removeItem(OPERATOR_TOKEN_KEY)
  store.removeItem(PROFILE_KEY)
}

function parseProfile(raw: string | null): StoredOperator | null {
  if (!raw) {
    return null
  }
  try {
    const value = JSON.parse(raw) as Partial<StoredOperator>
    if (!value.operator || typeof value.expiresAt !== 'number' || value.expiresAt <= Date.now()) {
      return null
    }
    return {
      operator: normalizeOperator(value.operator),
      expiresAt: value.expiresAt
    }
  } catch {
    return null
  }
}

function normalizeOperator(value: Partial<Operator>): Operator {
  if (!value.id || !value.email || !value.name || !value.role || !ROLES.has(value.role)) {
    throw new Error('operator profile is incomplete')
  }
  const status = value.status === 'active' || value.status === 'suspended' ? value.status : null
  return {
    id: value.id,
    role: value.role,
    email: value.email,
    name: value.name,
    status,
    last_login_at: typeof value.last_login_at === 'string' ? value.last_login_at : null
  }
}
