<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { isDevelopingPath } from '~/utils/nav'

const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const session = useSessionStore()

const open = ref(false)
const developing = computed(() => isDevelopingPath(route.path))

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
const navbarStore = useNavbarActions()
const navbarActions = computed(() => navbarStore.value.current)

function onNavbarPrimary(event: MouseEvent) {
  const actions = navbarActions.value
  if (!actions) {
    return
  }
  if (actions.primaryForm) {
    const form = document.getElementById(actions.primaryForm)
    if (form instanceof HTMLFormElement) {
      event.preventDefault()
      form.requestSubmit()
    }
    return
  }
  actions.onPrimary?.()
}
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

const { displayName } = useOperatorMe()

const accountEmail = computed(() => session.operator?.email?.trim() ?? '')
const accountName = computed(() => displayName.value.trim() || accountEmail.value)
const initials = computed(() => {
  const source = accountName.value
  return source ? source.slice(0, 1).toUpperCase() : '?'
})

async function logout() {
  session.logout()
  await navigateTo(localePath('/login'))
}

const sidebarScrollers = new Set<HTMLElement>()
const scrollingTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()
let sidebarResizeObserver: ResizeObserver | undefined
let sidebarScrollActive = true

function syncSidebarScroll(el: HTMLElement) {
  const edge = 4
  const overflow = el.scrollHeight - el.clientHeight > edge
  el.toggleAttribute('data-overflow-top', overflow && el.scrollTop > edge)
  el.toggleAttribute('data-overflow-bottom', overflow && el.scrollTop + el.clientHeight < el.scrollHeight - edge)
}

function onSidebarScroll(event: Event) {
  const el = event.currentTarget
  if (!(el instanceof HTMLElement)) {
    return
  }
  syncSidebarScroll(el)
  el.classList.add('is-scrolling')
  const previous = scrollingTimers.get(el)
  if (previous) {
    clearTimeout(previous)
  }
  scrollingTimers.set(el, setTimeout(() => {
    el.classList.remove('is-scrolling')
  }, 700))
}

function bindSidebarScroll() {
  if (!sidebarScrollActive) {
    return
  }
  document.querySelectorAll<HTMLElement>('.sidebar-scroll').forEach((el) => {
    if (!sidebarScrollers.has(el)) {
      sidebarScrollers.add(el)
      el.addEventListener('scroll', onSidebarScroll, { passive: true })
    }
    sidebarResizeObserver?.observe(el)
    for (const child of el.children) {
      if (child instanceof HTMLElement) {
        sidebarResizeObserver?.observe(child)
      }
    }
    syncSidebarScroll(el)
  })
}

onMounted(() => {
  sidebarResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const target = entry.target
      const el = target.classList.contains('sidebar-scroll')
        ? target
        : target.closest('.sidebar-scroll')
      if (el instanceof HTMLElement) {
        syncSidebarScroll(el)
      }
    }
  })
  bindSidebarScroll()
  requestAnimationFrame(() => bindSidebarScroll())
  document.fonts?.ready.then(() => bindSidebarScroll())
})

watch(menuGroups, () => {
  nextTick(() => bindSidebarScroll())
})

watch(open, () => {
  nextTick(() => bindSidebarScroll())
})

onUnmounted(() => {
  sidebarScrollActive = false
  sidebarResizeObserver?.disconnect()
  sidebarResizeObserver = undefined
  for (const el of sidebarScrollers) {
    el.removeEventListener('scroll', onSidebarScroll)
    const timer = scrollingTimers.get(el)
    if (timer) {
      clearTimeout(timer)
    }
  }
  sidebarScrollers.clear()
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="admin"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ body: 'sidebar-scroll', footer: 'lg:border-t lg:border-default' }"
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
          class="flex w-full min-w-0 flex-col gap-2"
          :class="collapsed ? 'items-center' : ''"
        >
          <div
            class="flex items-center gap-1"
            :class="collapsed ? 'flex-col' : ''"
          >
            <LocaleSwitch :collapsed="collapsed" />
            <ColorModeSwitch />
          </div>
          <div
            class="flex min-w-0 items-center gap-2"
            :class="collapsed ? 'flex-col' : 'w-full'"
          >
            <UUser
              :name="collapsed ? undefined : accountName"
              :description="collapsed || !accountEmail ? undefined : accountEmail"
              :avatar="{ text: initials, alt: accountName }"
              :to="localePath('/account')"
              size="sm"
              class="min-w-0"
              :class="collapsed ? '' : 'flex-1'"
              :ui="{
                wrapper: 'min-w-0',
                name: 'truncate',
                description: 'truncate'
              }"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-log-out"
              square
              class="shrink-0"
              :aria-label="$t('nav.logout')"
              @click="logout"
            />
          </div>
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
            <div class="flex min-w-0 items-center gap-2">
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
                    class="inline-flex min-w-0 items-center gap-2"
                    :class="index === crumbs.length - 1
                      ? 'text-xl font-semibold text-highlighted'
                      : 'text-sm font-medium'"
                  >
                    <span class="truncate">
                      {{ item.label }}
                    </span>
                    <UBadge
                      v-if="developing && index === crumbs.length - 1"
                      color="neutral"
                      variant="subtle"
                      class="shrink-0 text-xs font-medium"
                    >
                      {{ $t('nav.developing') }}
                    </UBadge>
                  </span>
                </template>
              </UBreadcrumb>
              <template v-else>
                <span class="truncate text-xl font-semibold text-highlighted">
                  {{ navbarTitle }}
                </span>
                <UBadge
                  v-if="developing"
                  color="neutral"
                  variant="subtle"
                  class="shrink-0 text-xs font-medium"
                >
                  {{ $t('nav.developing') }}
                </UBadge>
              </template>
            </div>
          </template>
          <template #right>
            <div
              v-if="navbarActions"
              class="flex shrink-0 items-center gap-2"
            >
              <UButton
                v-if="navbarActions.showDelete"
                type="button"
                color="error"
                variant="outline"
                :loading="navbarActions.deleting"
                :disabled="navbarActions.busy || navbarActions.deleteDisabled"
                @click="navbarActions.onDelete()"
              >
                {{ $t('actions.delete') }}
              </UButton>
              <UButton
                :type="navbarActions.primaryForm ? 'submit' : 'button'"
                :form="navbarActions.primaryForm || undefined"
                :loading="navbarActions.primaryLoading"
                :disabled="navbarActions.busy"
                @click="onNavbarPrimary"
              >
                {{ navbarActions.primaryLabel }}
              </UButton>
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<style scoped>
:deep(.sidebar-scroll) {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

:deep(.sidebar-scroll:hover),
:deep(.sidebar-scroll.is-scrolling) {
  scrollbar-color: color-mix(in oklab, var(--ui-text) 40%, transparent) transparent;
}

:deep(.sidebar-scroll)::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

:deep(.sidebar-scroll)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.sidebar-scroll)::-webkit-scrollbar-thumb {
  border: 3px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
  background-color: transparent;
}

:deep(.sidebar-scroll:hover)::-webkit-scrollbar-thumb,
:deep(.sidebar-scroll.is-scrolling)::-webkit-scrollbar-thumb {
  background-color: color-mix(in oklab, var(--ui-text) 40%, transparent);
}

:deep(.sidebar-scroll[data-overflow-top]:not([data-overflow-bottom])) {
  --sidebar-mask: linear-gradient(to bottom, transparent, #000 1.5rem);
}

:deep(.sidebar-scroll[data-overflow-bottom]:not([data-overflow-top])) {
  --sidebar-mask: linear-gradient(to bottom, #000 calc(100% - 1.5rem), transparent);
}

:deep(.sidebar-scroll[data-overflow-top][data-overflow-bottom]) {
  --sidebar-mask: linear-gradient(
    to bottom,
    transparent,
    #000 1.5rem,
    #000 calc(100% - 1.5rem),
    transparent
  );
}

:deep(.sidebar-scroll[data-overflow-top]),
:deep(.sidebar-scroll[data-overflow-bottom]) {
  -webkit-mask-image: var(--sidebar-mask);
  mask-image: var(--sidebar-mask);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
</style>
