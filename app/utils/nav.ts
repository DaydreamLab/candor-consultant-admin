import type { Role } from '~/types/admin'
import { isPlatformRole } from '~/types/admin'

export interface NavItem {
  key: string
  to: string
  icon: string
  platformOnly?: boolean
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
      { key: 'cases', to: '/cases', icon: 'i-lucide-folder-kanban' },
      { key: 'labs', to: '/labs', icon: 'i-lucide-flask-conical' },
      { key: 'progress', to: '/progress', icon: 'i-lucide-list-checks' },
      { key: 'reviews', to: '/reviews', icon: 'i-lucide-badge-check' }
    ]
  },
  {
    key: 'warehouse',
    items: [
      { key: 'products', to: '/products', icon: 'i-lucide-package' },
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
