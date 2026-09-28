<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { NavItem } from '~/utils/nav'
import { normalizeAdminPath } from '~/utils/nav'

const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const session = useSessionStore()
const { orgLabel } = useOrgScope()

const open = ref(false)

const groups = computed(() => visibleNavGroups(session.role))

function itemLabel(item: NavItem) {
  const name = t(`nav.${item.key}`)
  if (item.developing === false) {
    return name
  }
  return `${name} ${t('nav.developing')}`
}

const menuGroups = computed(() =>
  groups.value.map(group => ({
    key: group.key,
    label: t(`nav.${group.key}`),
    items: group.items.map(item => ({
      label: itemLabel(item),
      icon: item.icon,
      to: localePath(item.to),
      onSelect: () => {
        open.value = false
      }
    }) satisfies NavigationMenuItem)
  }))
)

const headerTitle = computed(() => {
  const current = normalizeAdminPath(route.path)
  if (current === '/account') {
    return t('nav.account')
  }
  for (const group of groups.value) {
    for (const item of group.items) {
      const active = item.to === '/'
        ? current === '/' || current === ''
        : current === item.to || current.startsWith(`${item.to}/`)
      if (active) {
        return t(`nav.${item.key}`)
      }
    }
  }
  return t('brandAdmin')
})

const onAccount = computed(() => normalizeAdminPath(route.path) === '/account')

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
              {{ session.session?.name }}
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

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="headerTitle">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <LocaleSwitch />
            <ColorModeSwitch />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-5 sm:p-7">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
