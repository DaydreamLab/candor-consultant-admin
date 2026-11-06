import type { Operator, OperatorRole } from '~/types/operator'

const ROLE_SET = new Set<OperatorRole>(['expert', 'ops', 'admin'])

export type PostLoginHomePath = '/expert' | '/' | '/choose-panel'

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
 * Core login／me 應回 `roles` 陣列；單一角色可省略，前端退回 `role`。
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

/** 同時有 expert 與 admin／ops → 登入後需選面板。 */
export function needsSurfaceChooser(roles: readonly OperatorRole[]): boolean {
  return hasExpertRole(roles) && hasOpsAdminRole(roles)
}

export function canAccessExpertStation(roles: readonly OperatorRole[]): boolean {
  return hasExpertRole(roles)
}

export function canAccessAdminConsole(roles: readonly OperatorRole[]): boolean {
  return hasOpsAdminRole(roles)
}

/**
 * 登入後預設路徑：
 * - 多角色 → 選擇面板
 * - 僅 expert → 專家站
 * - 其餘 → 營運後台
 *
 * 已登入使用者直接打 `/` 或 `/expert/*` 不強制再經過選擇頁。
 */
export function postLoginHomePath(roles: readonly OperatorRole[]): PostLoginHomePath {
  if (needsSurfaceChooser(roles)) {
    return '/choose-panel'
  }
  if (isExpertOnly(roles)) {
    return '/expert'
  }
  return '/'
}

export function isExpertStationPath(path: string): boolean {
  const current = normalizeAppPath(path)
  return current === '/expert' || current.startsWith('/expert/')
}

export function isChoosePanelPath(path: string): boolean {
  return normalizeAppPath(path) === '/choose-panel'
}

export function isPublicAppPath(path: string): boolean {
  const current = normalizeAppPath(path)
  return current === '/login' || current === '/privacy-policy'
}

/** 營運後台頁（非公開、非專家站、非選擇面板）。 */
export function isAdminConsolePath(path: string): boolean {
  return !isPublicAppPath(path) && !isExpertStationPath(path) && !isChoosePanelPath(path)
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
