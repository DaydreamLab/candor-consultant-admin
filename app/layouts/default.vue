<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { normalizeAdminPath } from '~/utils/nav'

const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const session = useSessionStore()
const { orgLabel } = useOrgScope()

const open = ref(false)

const groups = computed(() => visibleNavGroups(session.role))

const menuGroups = computed(() =>
  groups.value.map(group => ({
    key: group.key,
    label: t(`nav.${group.key}`),
    items: group.items.map((item) => {
      const menuItem: NavigationMenuItem = {
        label: t(`nav.${item.key}`),
        icon: item.icon,
        to: localePath(item.to),
        onSelect: () => {
          open.value = false
        }
      }
      if (item.developing !== false) {
        menuItem.badge = {
          label: t('nav.developing'),
          color: 'neutral',
          variant: 'subtle'
        }
      }
      return menuItem
    })
  }))
)

const { items: crumbs } = usePageCrumbs()
const hasParentCrumb = computed(() => crumbs.value.length > 1)
const navbarTitle = computed(() => {
  const last = crumbs.value[crumbs.value.length - 1]
  return typeof last?.label === 'string' && last.label.trim() ? last.label : t('brandAdmin')
})
const navbarCrumbs = computed(() => {
  const items = crumbs.value
  return items.map((item, index) => ({
    ...item,
    class: index === items.length - 1 ? 'min-w-0' : 'shrink-0'
  }))
})

const onAccount = computed(() => normalizeAdminPath(route.path) === '/account')
const { displayName } = useOperatorMe()

const roleLabel = computed(() => {
  const role = session.operator?.role
  return role ? t(`roles.${role}`) : ''
})

const orgSubtitle = computed(() => orgLabel(session.session?.orgId))

async function logout() {
  session.logout()
  await navigateTo(localePath('/login'))
}
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="admin"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <BrandMark :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <div
          v-for="group in menuGroups"
          :key="group.key"
          class="flex flex-col"
        >
          <p
            v-if="!collapsed"
            class="px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-dimmed"
          >
            {{ group.label }}
          </p>
          <UNavigationMenu
            :collapsed="collapsed"
            :items="group.items"
            orientation="vertical"
            tooltip
          />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <div
          class="flex w-full min-w-0"
          :class="collapsed ? 'flex-col items-center gap-2' : 'items-center gap-2'"
        >
          <UButton
            v-if="collapsed"
            color="neutral"
            variant="ghost"
            icon="i-lucide-circle-user"
            square
            :to="localePath('/account')"
            :aria-label="$t('nav.account')"
          />
          <div
            v-else
            class="min-w-0 flex-1"
          >
            <NuxtLink
              :to="localePath('/account')"
              class="block truncate text-sm font-medium hover:underline"
              :class="onAccount ? 'text-primary' : 'text-highlighted'"
            >
              {{ displayName }}
            </NuxtLink>
            <p class="truncate text-xs text-muted">
              {{ roleLabel }}
            </p>
            <p
              v-if="orgSubtitle"
              class="truncate text-xs text-dimmed"
            >
              {{ orgSubtitle }}
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-out"
            :label="collapsed ? undefined : $t('nav.logout')"
            :block="!collapsed"
            square
            @click="logout"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel :ui="{ body: 'p-5 sm:p-7' }">
      <template #header>
        <UDashboardNavbar :ui="{ title: 'min-w-0' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #title>
            <UBreadcrumb
              v-if="hasParentCrumb"
              as="div"
              :items="navbarCrumbs"
              class="min-w-0"
              :ui="{
                root: 'min-w-0',
                list: 'min-w-0 flex-nowrap',
                linkLabel: 'truncate'
              }"
            >
              <template #item-label="{ item, index }">
                <span
                  :class="index === crumbs.length - 1
                    ? 'block truncate text-xl font-semibold text-highlighted'
                    : 'text-sm font-medium'"
                >
                  {{ item.label }}
                </span>
              </template>
            </UBreadcrumb>
            <span
              v-else
              class="truncate text-xl font-semibold text-highlighted"
            >
              {{ navbarTitle }}
            </span>
          </template>
          <template #right>
            <LocaleSwitch />
            <ColorModeSwitch />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
