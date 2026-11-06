import type { Operator, OperatorRole } from '~/types/operator'
import { sortOperatorRoles } from '~/utils/operator-role-order'

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
 * 只讀 `operator.roles[]`（core 已刪單一 `role`；不讀 permissions）。
 * 非法／空陣列 → `[]`；合法值依 admin→ops→expert 排序。
 */
export function operatorRoles(
  operator: Pick<Operator, 'roles'> | null | undefined
): OperatorRole[] {
  if (!operator || !Array.isArray(operator.roles)) {
    return []
  }
  const unique: OperatorRole[] = []
  for (const role of operator.roles) {
    if (ROLE_SET.has(role) && !unique.includes(role)) {
      unique.push(role)
    }
  }
  return sortOperatorRoles(unique)
}

export function hasAdminRole(roles: readonly OperatorRole[]): boolean {
  return roles.includes('admin')
}

/** 陣列含 `expert`（不含 admin 繼承）。 */
export function hasExpertRole(roles: readonly OperatorRole[]): boolean {
  return roles.includes('expert')
}

/**
 * 營運後台能力：`admin` 或 `ops`。
 * （`admin` 含 ops 能力。）
 */
export function hasOpsAdminRole(roles: readonly OperatorRole[]): boolean {
  return roles.includes('admin') || roles.includes('ops')
}

/**
 * 專家站能力：`admin` 或 `expert`。
 * （`admin` 含 expert 能力。）
 */
export function hasExpertCapability(roles: readonly OperatorRole[]): boolean {
  return roles.includes('admin') || roles.includes('expert')
}

/** 僅有 expert、沒有 admin／ops。 */
export function isExpertOnly(roles: readonly OperatorRole[]): boolean {
  return hasExpertRole(roles) && !hasOpsAdminRole(roles)
}

/** 同時有營運與專家站能力 → 登入後需選面板（含單純 `admin`）。 */
export function needsSurfaceChooser(roles: readonly OperatorRole[]): boolean {
  return hasOpsAdminRole(roles) && hasExpertCapability(roles)
}

export function canAccessExpertStation(roles: readonly OperatorRole[]): boolean {
  return hasExpertCapability(roles)
}

export function canAccessAdminConsole(roles: readonly OperatorRole[]): boolean {
  return hasOpsAdminRole(roles)
}

/**
 * 登入後預設路徑：
 * - 需選面板 → `/choose-panel`
 * - 僅 expert → 專家站
 * - 其餘有營運能力 → 營運後台
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
