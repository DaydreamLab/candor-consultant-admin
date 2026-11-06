import type { Role } from '~/types/admin'
import { isPlatformRole } from '~/types/admin'
import type { OperatorRole } from '~/types/operator'
import { canViewCtaCatalog } from '~/utils/cta-catalog-access'
import { canViewExpertBookingProduct } from '~/utils/expert-booking-product-access'
import { canAccessKnowledge } from '~/utils/knowledge-access'

export interface NavItem {
  key: string
  to: string
  icon: string
  platformOnly?: boolean
  /** 僅 ops／admin 可見（知識）。 */
  knowledgeOnly?: boolean
  /** 僅 admin／ops 可見（引導）；expert 隱藏整項。 */
  guidanceOnly?: boolean
  /** 僅 ops／admin 可見（退款申請；expert 隱藏，Irice 11/4）。 */
  opsAdminOnly?: boolean
  /** 僅 ops／admin 可見（專人預約商品；admin 可編、ops 只讀）。 */
  expertBookingProductOnly?: boolean
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
 * 側欄 IA（短物件名 2026-11-04）：
 * 總覽（最上、無組標）→ 營運 → 學習 → 商品 → 系統 → 開發中。
 * 每項只出現一次（26；expert 看不到引導／退款申請／預約商品則更少）。組 key 與 item key 共用 `nav.*`。
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
      { key: 'custom', to: '/custom', icon: 'i-lucide-badge-check', developing: false },
      { key: 'orders', to: '/orders', icon: 'i-lucide-shopping-bag', developing: false },
      { key: 'expertBookings', to: '/expert-bookings', icon: 'i-lucide-calendar-heart', developing: false },
      { key: 'refundRequests', to: '/refund-requests', icon: 'i-lucide-wallet', developing: false, opsAdminOnly: true },
      // shipping：物流（列表／詳情讀取已接；寫入仍 mock）→ 無即將上線 badge
      { key: 'shipping', to: '/shipping', icon: 'i-lucide-truck', developing: false },
      { key: 'users', to: '/users', icon: 'i-lucide-users', developing: false }
    ]
  },
  {
    key: 'learning',
    items: [
      { key: 'knowledge', to: '/knowledge/datasets', icon: 'i-lucide-book-open', developing: false, knowledgeOnly: true },
      { key: 'weights', to: '/weights', icon: 'i-lucide-sliders-horizontal', developing: false }
    ]
  },
  {
    key: 'catalog',
    items: [
      { key: 'plans', to: '/package-plans', icon: 'i-lucide-layers', developing: false },
      { key: 'expertPlans', to: '/expert-plans', icon: 'i-lucide-sparkles', developing: false },
      {
        key: 'expertBookingProduct',
        to: '/expert-booking-product',
        icon: 'i-lucide-ticket',
        developing: false,
        expertBookingProductOnly: true
      },
      { key: 'supplements', to: '/supplements', icon: 'i-lucide-package', developing: false },
      // checkups：健檢主檔（語意 in-scope；local mock、未接 API）→ badge 即將上線
      // 勿與開發中「排程」/scheduling 或「預約」/lab-appointments 混淆
      { key: 'checkups', to: '/checkups', icon: 'i-lucide-droplet' }
    ]
  },
  {
    key: 'system',
    items: [
      // Prefer first visible anchor hash so sidebar entry never hits empty-hash normalize.
      { key: 'settings', to: '/settings#payment', icon: 'i-lucide-settings', developing: false, exact: true },
      { key: 'privacy', to: '/settings/privacy', icon: 'i-lucide-shield', developing: false },
      { key: 'guidance', to: '/settings/guidance', icon: 'i-lucide-mouse-pointer-click', developing: false, guidanceOnly: true },
      { key: 'assistant', to: '/assistant', icon: 'i-lucide-bot', developing: false }
    ]
  },
  {
    key: 'developing',
    items: [
      { key: 'cases', to: '/cases', icon: 'i-lucide-folder-kanban' },
      { key: 'scheduling', to: '/scheduling', icon: 'i-lucide-flask-conical' },
      { key: 'appointments', to: '/lab-appointments', icon: 'i-lucide-calendar-clock' },
      // fulfillment：履約範例頁（勿與營運組「物流」混淆）
      { key: 'fulfillment', to: '/fulfillment', icon: 'i-lucide-list-checks' },
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
  if (current === '/expert-plans' || current.startsWith('/expert-plans/')) {
    return false
  }
  if (current === '/refund-requests' || current.startsWith('/refund-requests/')) {
    return false
  }
  if (current === '/orders' || current.startsWith('/orders/')) {
    return false
  }
  if (current === '/shipping' || current.startsWith('/shipping/')) {
    return false
  }
  if (current === '/supplements' || current.startsWith('/supplements/')) {
    return false
  }
  if (current === '/users' || current.startsWith('/users/')) {
    return false
  }
  if (current === '/assistant' || current.startsWith('/assistant/')) {
    return false
  }
  if (current === '/settings' || current.startsWith('/settings/')) {
    return false
  }
  if (current === '/weights' || current.startsWith('/weights/')) {
    return false
  }
  if (current === '/custom' || current.startsWith('/custom/')) {
    return false
  }
  if (current === '/expert-bookings' || current.startsWith('/expert-bookings/')) {
    return false
  }
  if (current === '/expert-booking-product' || current.startsWith('/expert-booking-product/')) {
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
        if (item.guidanceOnly && !canViewCtaCatalog(operatorRole)) {
          return false
        }
        if (item.opsAdminOnly && operatorRole === 'expert') {
          return false
        }
        if (item.expertBookingProductOnly && !canViewExpertBookingProduct(operatorRole)) {
          return false
        }
        return true
      })
    }))
    .filter(group => group.items.length > 0)
}
