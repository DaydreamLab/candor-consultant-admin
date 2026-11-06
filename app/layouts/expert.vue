<script setup lang="ts">
import { hasOpsAdminRole, operatorRoles } from '~/utils/operator-roles'

const localePath = useLocalePath()
const route = useRoute()
const session = useSessionStore()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const markSrc = computed(() => withAppBase(runtimeConfig.app.baseURL, '/brand/candor-mark.png'))
const appVersionLabel = computed(() => {
  const version = String(runtimeConfig.public.appVersion || '').trim()
  return version || 'dev'
})
const copyrightYear = new Date().getFullYear()
const showAdminSwitch = computed(() => hasOpsAdminRole(operatorRoles(session.operator)))

useHead({
  title: t('expertStation.brand')
})

const path = computed(() => route.path.replace(/^\/en(?=\/|$)/, '') || '/')

const bookingsActive = computed(() => path.value.startsWith('/expert/bookings'))

const homeActive = computed(() => (
  path.value === '/expert'
  || path.value.startsWith('/expert/calendar')
))

const displayName = computed(() => {
  const name = session.operator?.name?.trim()
  return name || session.operator?.email || '—'
})

function logout() {
  session.logout()
  void navigateTo(localePath('/login'))
}
</script>

<template>
  <div
    class="flex min-h-screen flex-col bg-muted/30 text-default"
    data-surface="expert"
  >
    <header class="border-b border-default bg-default text-default">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <NuxtLink
          :to="localePath('/expert')"
          class="flex min-w-0 items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <img
            :src="markSrc"
            alt=""
            class="size-8 shrink-0 object-contain"
          >
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold">
              {{ $t('expertStation.brand') }}
            </span>
            <span class="block truncate text-xs text-muted">
              {{ $t('expertStation.host') }}
            </span>
          </span>
        </NuxtLink>
        <nav class="flex flex-1 flex-wrap items-center gap-2">
          <NuxtLink
            :to="localePath('/expert')"
            class="rounded-md px-3 py-1.5 text-sm"
            :class="homeActive ? 'bg-elevated' : 'hover:bg-elevated'"
          >
            {{ $t('expertStation.nav.home') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/expert/bookings')"
            class="rounded-md px-3 py-1.5 text-sm"
            :class="bookingsActive ? 'bg-elevated' : 'hover:bg-elevated'"
          >
            {{ $t('expertStation.nav.bookings') }}
          </NuxtLink>
          <NuxtLink
            v-if="showAdminSwitch"
            :to="localePath('/')"
            class="rounded-md px-3 py-1.5 text-sm hover:bg-elevated"
            data-testid="expert-to-admin"
          >
            {{ $t('expertStation.nav.toAdmin') }}
          </NuxtLink>
        </nav>
        <div class="flex items-center gap-1">
          <ColorModeSwitch />
          <span class="px-2 text-sm text-muted">
            {{ displayName }}
          </span>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-log-out"
            @click="logout"
          >
            {{ $t('expertStation.nav.logout') }}
          </UButton>
        </div>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <slot />
    </main>
    <footer class="border-t border-default bg-default">
      <p class="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-3 text-center text-[11px] leading-none text-dimmed">
        <span>{{ $t('expertStation.footer.copyright', { year: copyrightYear }) }}</span>
        <span
          class="font-mono"
          data-testid="app-version"
        >{{ appVersionLabel }}</span>
      </p>
    </footer>
  </div>
</template>
