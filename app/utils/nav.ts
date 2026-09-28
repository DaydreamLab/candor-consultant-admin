import type { Role } from '~/types/admin'
import { isPlatformRole } from '~/types/admin'

export interface NavItem {
  key: string
  to: string
  icon: string
  platformOnly?: boolean
  /** false：側欄不加「開發中」。未設視為開發中。 */
  developing?: boolean
}

export interface NavGroup {
  key: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'ops',
    items: [
      { key: 'workbench', to: '/', icon: 'i-lucide-layout-dashboard' },
      { key: 'orders', to: '/orders', icon: 'i-lucide-shopping-bag', developing: false },
      { key: 'cases', to: '/cases', icon: 'i-lucide-folder-kanban' },
      { key: 'labs', to: '/labs', icon: 'i-lucide-flask-conical' },
      { key: 'progress', to: '/progress', icon: 'i-lucide-list-checks' },
      { key: 'reviews', to: '/reviews', icon: 'i-lucide-badge-check' }
    ]
  },
  {
    key: 'warehouse',
    items: [
      { key: 'products', to: '/products', icon: 'i-lucide-package', developing: false },
      { key: 'packagePlans', to: '/package-plans', icon: 'i-lucide-layers', developing: false },
      { key: 'selections', to: '/selections', icon: 'i-lucide-clipboard-list' },
      { key: 'shipping', to: '/shipping', icon: 'i-lucide-truck' }
    ]
  },
  {
    key: 'finance',
    items: [
      { key: 'invoices', to: '/invoices', icon: 'i-lucide-receipt' },
      { key: 'reports', to: '/reports', icon: 'i-lucide-chart-column' }
    ]
  },
  {
    key: 'platform',
    items: [
      { key: 'orgs', to: '/orgs', icon: 'i-lucide-building-2', platformOnly: true },
      { key: 'users', to: '/users', icon: 'i-lucide-users' },
      { key: 'settings', to: '/settings', icon: 'i-lucide-settings' }
    ]
  }
]

export function normalizeAdminPath(path: string): string {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  if (stripped.length > 1 && stripped.endsWith('/')) {
    return stripped.slice(0, -1)
  }
  return stripped
}

/** 頁面標題不加「開發中」：訂單、方案、商品（含子頁）、目前帳號。 */
export function isDevelopingPath(path: string): boolean {
  const current = normalizeAdminPath(path)
  if (current === '/account' || current === '/orders' || current === '/package-plans') {
    return false
  }
  if (current === '/products' || current.startsWith('/products/')) {
    return false
  }
  return true
}

export function visibleNavGroups(role: Role | null): NavGroup[] {
  if (!role) {
    return []
  }

  return NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.platformOnly || isPlatformRole(role))
    }))
    .filter(group => group.items.length > 0)
}
