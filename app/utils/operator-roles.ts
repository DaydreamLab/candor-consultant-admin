import type { Operator, OperatorRole } from '~/types/operator'

const ROLE_SET = new Set<OperatorRole>(['expert', 'ops', 'admin'])

/** Normalize path without i18n prefix or trailing slash (except root). */
export function normalizeAppPath(path: string): string {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  if (stripped.length > 1 && stripped.endsWith('/')) {
    return stripped.slice(0, -1)
  }
  return stripped
}

/**
 * Prefer optional `roles[]` when present (multi-role); else `[operator.role]`.
 * Core login 目前仍回單一 `role`；多角色可經 profile.roles 擴充。
 */
export function operatorRoles(
  operator: Pick<Operator, 'role'> & { roles?: OperatorRole[] | null } | null | undefined
): OperatorRole[] {
  if (!operator) {
    return []
  }
  if (Array.isArray(operator.roles) && operator.roles.length > 0) {
    const unique: OperatorRole[] = []
    for (const role of operator.roles) {
      if (ROLE_SET.has(role) && !unique.includes(role)) {
        unique.push(role)
      }
    }
    if (unique.length > 0) {
      return unique
    }
  }
  return ROLE_SET.has(operator.role) ? [operator.role] : []
}

export function hasExpertRole(roles: readonly OperatorRole[]): boolean {
  return roles.includes('expert')
}

export function hasOpsAdminRole(roles: readonly OperatorRole[]): boolean {
  return roles.includes('admin') || roles.includes('ops')
}

/** 僅有 expert、沒有 admin／ops。 */
export function isExpertOnly(roles: readonly OperatorRole[]): boolean {
  return hasExpertRole(roles) && !hasOpsAdminRole(roles)
}

export function canAccessExpertStation(roles: readonly OperatorRole[]): boolean {
  return hasExpertRole(roles)
}

export function canAccessAdminConsole(roles: readonly OperatorRole[]): boolean {
  return hasOpsAdminRole(roles)
}

/** 登入後預設首頁：僅 expert → 專家站；其餘（含雙角色）→ 營運後台。 */
export function postLoginHomePath(roles: readonly OperatorRole[]): '/expert' | '/' {
  if (isExpertOnly(roles)) {
    return '/expert'
  }
  return '/'
}

export function isExpertStationPath(path: string): boolean {
  const current = normalizeAppPath(path)
  return current === '/expert' || current.startsWith('/expert/')
}

export function isPublicAppPath(path: string): boolean {
  const current = normalizeAppPath(path)
  return current === '/login' || current === '/privacy-policy'
}

/** 營運後台頁（非公開、非專家站）。 */
export function isAdminConsolePath(path: string): boolean {
  return !isPublicAppPath(path) && !isExpertStationPath(path)
}

/**
 * 舊專家站書籤 → 新 `/expert/*` 路徑。
 * 不含 `/`（已是營運後台首頁）。
 */
export function legacyExpertBookmarkRedirect(path: string): string | null {
  const current = normalizeAppPath(path)
  if (current === '/bookings' || current.startsWith('/bookings/')) {
    return `/expert${current}`
  }
  if (current === '/calendar' || current.startsWith('/calendar/')) {
    return `/expert${current}`
  }
  return null
}
