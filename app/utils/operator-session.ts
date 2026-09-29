import type { Operator, OperatorLoginData, OperatorRole } from '~/types/operator'

export const OPERATOR_TOKEN_KEY = 'candor.operator.token'

const PROFILE_KEY = 'candor.operator.profile'

const ROLES = new Set<OperatorRole>(['expert', 'ops', 'admin'])

export type OperatorTokenStore = 'local' | 'session'

export interface StoredOperator {
  operator: Operator
  expiresAt: number
}

function browserStore(kind: OperatorTokenStore): Storage | null {
  if (!import.meta.client) {
    return null
  }
  return kind === 'local' ? window.localStorage : window.sessionStorage
}

function activeStore(): Storage | null {
  if (!import.meta.client) {
    return null
  }
  if (window.sessionStorage.getItem(OPERATOR_TOKEN_KEY)) {
    return window.sessionStorage
  }
  if (window.localStorage.getItem(OPERATOR_TOKEN_KEY)) {
    return window.localStorage
  }
  return null
}

export function readOperatorToken() {
  if (!import.meta.client) {
    return null
  }
  return window.sessionStorage.getItem(OPERATOR_TOKEN_KEY)
    || window.localStorage.getItem(OPERATOR_TOKEN_KEY)
}

export function readStoredOperator(): StoredOperator | null {
  const store = activeStore()
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

export function writeOperatorSession(
  data: OperatorLoginData,
  rememberMe: boolean = true
) {
  const kind: OperatorTokenStore = rememberMe ? 'local' : 'session'
  const store = browserStore(kind)
  if (!store) {
    return
  }
  clearOperatorSession()
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
  if (!import.meta.client) {
    return
  }
  for (const store of [window.sessionStorage, window.localStorage]) {
    store.removeItem(OPERATOR_TOKEN_KEY)
    store.removeItem(PROFILE_KEY)
  }
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
