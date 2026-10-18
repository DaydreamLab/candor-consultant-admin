import type { Role } from '~/types/admin'
import { isPlatformRole } from '~/types/admin'
import type { OperatorRole } from '~/types/operator'

export interface NavItem {
  key: string
  to: string
  icon: string
  platformOnly?: boolean
  /** 對應 `session.operator.role`；列出的角色不顯示此 nav 項。 */
  hideForOperatorRoles?: OperatorRole[]
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
      { key: 'users', to: '/users', icon: 'i-lucide-users', developing: false },
      { key: 'cases', to: '/cases', icon: 'i-lucide-folder-kanban' },
      { key: 'labs', to: '/labs', icon: 'i-lucide-flask-conical' },
      { key: 'labAppointments', to: '/lab-appointments', icon: 'i-lucide-calendar-clock' },
      { key: 'progress', to: '/progress', icon: 'i-lucide-list-checks' },
      { key: 'reviews', to: '/expert-case-reviews', icon: 'i-lucide-badge-check', developing: false }
    ]
  },
  {
    key: 'catalog',
    items: [
      { key: 'packagePlans', to: '/package-plans', icon: 'i-lucide-layers', developing: false },
      { key: 'products', to: '/products', icon: 'i-lucide-package', developing: false },
      { key: 'labServices', to: '/lab-services', icon: 'i-lucide-droplet' }
    ]
  },
  {
    key: 'warehouse',
    items: [
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
      { key: 'aiAssistant', to: '/ai-assistant', icon: 'i-lucide-bot', developing: false },
      {
        key: 'knowledge',
        to: '/knowledge/datasets',
        icon: 'i-lucide-book-open',
        developing: false,
        hideForOperatorRoles: ['expert']
      },
      { key: 'expertTuning', to: '/expert-tuning', icon: 'i-lucide-sliders-horizontal' },
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

/** 頁面標題不加「開發中」：訂單（含詳情）、方案、商品（含子頁）、會員（含詳情）、目前帳號。 */
export function isDevelopingPath(path: string): boolean {
  const current = normalizeAdminPath(path)
  if (current === '/account' || current === '/package-plans') {
    return false
  }
  if (current === '/orders' || current.startsWith('/orders/')) {
    return false
  }
  if (current === '/products' || current.startsWith('/products/')) {
    return false
  }
  if (current === '/users' || current.startsWith('/users/')) {
    return false
  }
  if (current === '/ai-assistant' || current.startsWith('/ai-assistant/')) {
    return false
  }
  if (current === '/expert-case-reviews' || current.startsWith('/expert-case-reviews/')) {
    return false
  }
  if (current === '/knowledge/datasets' || current.startsWith('/knowledge/datasets/')) {
    return false
  }
  if (current === '/knowledge/chunks' || current.startsWith('/knowledge/chunks/')) {
    return false
  }
  if (current === '/knowledge/retrieval-preview' || current.startsWith('/knowledge/retrieval-preview/')) {
    return false
  }
  if (current === '/knowledge/audit' || current.startsWith('/knowledge/audit/')) {
    return false
  }
  if (current === '/knowledge/dataset-groups' || current.startsWith('/knowledge/dataset-groups/')) {
    return false
  }
  if (current === '/knowledge/overview' || current.startsWith('/knowledge/overview/')) {
    return false
  }
  if (current === '/knowledge/config' || current.startsWith('/knowledge/config/')) {
    return false
  }
  if (current === '/knowledge' || current.startsWith('/knowledge/')) {
    return false
  }
  return true
}

export function visibleNavGroups(
  role: Role | null,
  operatorRole: OperatorRole | null = null
): NavGroup[] {
  if (!role) {
    return []
  }

  return NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.platformOnly && !isPlatformRole(role)) {
          return false
        }
        if (operatorRole && item.hideForOperatorRoles?.includes(operatorRole)) {
          return false
        }
        return true
      })
    }))
    .filter(group => group.items.length > 0)
}

/** operator JWT 角色為 expert 時不可進入知識管理路由（側欄亦隱藏）。 */
export function isKnowledgePathBlockedForExpert(path: string): boolean {
  const current = normalizeAdminPath(path)
  return current === '/knowledge' || current.startsWith('/knowledge/')
}
