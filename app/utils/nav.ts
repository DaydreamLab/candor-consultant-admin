import type { Role } from '~/types/admin'
import { isPlatformRole } from '~/types/admin'
import type { OperatorRole } from '~/types/operator'
import { canViewCtaCatalog } from '~/utils/cta-catalog-access'
import { canAccessKnowledge } from '~/utils/knowledge-access'

export interface NavItem {
  key: string
  to: string
  icon: string
  platformOnly?: boolean
  /** 僅 ops／admin 可見（知識管理）。 */
  knowledgeOnly?: boolean
  /** 僅 admin／ops 可見（CTA 目錄）；expert 隱藏整項。 */
  ctaCatalogOnly?: boolean
  /** RouterLink exact：設定總頁勿與 /settings/privacy 等子路徑同時亮起。 */
  exact?: boolean
  /** false：側欄不加「即將上線」。未設視為開發中／未上線。 */
  developing?: boolean
}

export interface NavGroup {
  key: string
  /** true：側欄不顯示組標（總覽頂層獨立項）。 */
  hideLabel?: boolean
  items: NavItem[]
}

/**
 * 側欄 IA（Irice 2026-10-27／設定組拆頁 2026-10-28）：
 * 總覽（最上、無組標）→ 案件 → 知識 → 商品 → 設定 → 開發中。
 * 每項只出現一次（22；expert 看不到 CTA 則 21）。組 key 與 item key 共用 `nav.*`。
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'workbench',
    hideLabel: true,
    items: [
      { key: 'workbench', to: '/', icon: 'i-lucide-layout-dashboard', developing: false }
    ]
  },
  {
    key: 'ops',
    items: [
      { key: 'reviews', to: '/expert-case-reviews', icon: 'i-lucide-badge-check', developing: false },
      { key: 'orders', to: '/orders', icon: 'i-lucide-shopping-bag', developing: false },
      // shipping：物流進度（列表／詳情讀取已接；寫入仍 mock）→ 無即將上線 badge
      { key: 'shipping', to: '/shipping', icon: 'i-lucide-truck', developing: false },
      { key: 'users', to: '/users', icon: 'i-lucide-users', developing: false }
    ]
  },
  {
    key: 'learning',
    items: [
      { key: 'knowledge', to: '/knowledge/datasets', icon: 'i-lucide-book-open', developing: false, knowledgeOnly: true },
      { key: 'expertTuning', to: '/expert-tuning', icon: 'i-lucide-sliders-horizontal', developing: false }
    ]
  },
  {
    key: 'catalog',
    items: [
      { key: 'packagePlans', to: '/package-plans', icon: 'i-lucide-layers', developing: false },
      { key: 'products', to: '/products', icon: 'i-lucide-package', developing: false },
      // labServices：採檢服務主檔（語意 in-scope；local mock、未接 API）→ badge 即將上線
      // 勿與開發中「採檢」/labs 或「預約記錄」/lab-appointments 混淆
      { key: 'labServices', to: '/lab-services', icon: 'i-lucide-droplet' }
    ]
  },
  {
    key: 'system',
    items: [
      // Prefer first visible anchor hash so sidebar entry never hits empty-hash normalize.
      { key: 'settings', to: '/settings#payment', icon: 'i-lucide-settings', developing: false, exact: true },
      { key: 'privacy', to: '/settings/privacy', icon: 'i-lucide-shield', developing: false },
      { key: 'ctaCatalog', to: '/settings/cta-catalog', icon: 'i-lucide-mouse-pointer-click', developing: false, ctaCatalogOnly: true },
      { key: 'aiAssistant', to: '/ai-assistant', icon: 'i-lucide-bot', developing: false }
    ]
  },
  {
    key: 'developing',
    items: [
      { key: 'cases', to: '/cases', icon: 'i-lucide-folder-kanban' },
      { key: 'labs', to: '/labs', icon: 'i-lucide-flask-conical' },
      { key: 'labAppointments', to: '/lab-appointments', icon: 'i-lucide-calendar-clock' },
      // progress：履約進度範例頁（勿與案件組「物流進度」混淆）
      { key: 'progress', to: '/progress', icon: 'i-lucide-list-checks' },
      { key: 'selections', to: '/selections', icon: 'i-lucide-clipboard-list' },
      { key: 'invoices', to: '/invoices', icon: 'i-lucide-receipt' },
      { key: 'reports', to: '/reports', icon: 'i-lucide-chart-column' },
      { key: 'orgs', to: '/orgs', icon: 'i-lucide-building-2', platformOnly: true }
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

/** 頁面標題不加「即將上線」：正式已上線頁（含子路徑）與目前帳號。 */
export function isDevelopingPath(path: string): boolean {
  const current = normalizeAdminPath(path)
  if (current === '/') {
    return false
  }
  if (current === '/account' || current === '/package-plans') {
    return false
  }
  if (current === '/orders' || current.startsWith('/orders/')) {
    return false
  }
  if (current === '/shipping' || current.startsWith('/shipping/')) {
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
  if (current === '/settings' || current.startsWith('/settings/')) {
    return false
  }
  if (current === '/expert-tuning' || current.startsWith('/expert-tuning/')) {
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
        if (item.knowledgeOnly && !canAccessKnowledge(operatorRole)) {
          return false
        }
        if (item.ctaCatalogOnly && !canViewCtaCatalog(operatorRole)) {
          return false
        }
        return true
      })
    }))
    .filter(group => group.items.length > 0)
}
