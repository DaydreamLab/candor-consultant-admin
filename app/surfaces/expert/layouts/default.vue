<script setup lang="ts">
const localePath = useLocalePath()
const route = useRoute()
const session = useSessionStore()

const path = computed(() => route.path.replace(/^\/en(?=\/|$)/, '') || '/')

const bookingsActive = computed(() => {
  return path.value === '/' || path.value.startsWith('/bookings')
})

const calendarActive = computed(() => path.value.startsWith('/calendar'))

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
  <div class="min-h-screen bg-muted/30 text-default">
    <header class="border-b border-default bg-[#0f172a] text-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold">
            {{ $t('expertStation.brand') }}
          </div>
          <div class="text-xs text-white/60">
            {{ $t('expertStation.host') }}
          </div>
        </div>
        <nav class="flex flex-1 flex-wrap items-center gap-2">
          <NuxtLink
            :to="localePath('/')"
            class="rounded-md px-3 py-1.5 text-sm"
            :class="bookingsActive ? 'bg-white/15' : 'hover:bg-white/10'"
          >
            {{ $t('expertStation.nav.bookings') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/calendar')"
            class="rounded-md px-3 py-1.5 text-sm"
            :class="calendarActive ? 'bg-white/15' : 'hover:bg-white/10'"
          >
            {{ $t('expertStation.nav.calendar') }}
          </NuxtLink>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm hover:bg-white/10"
            @click="logout"
          >
            {{ $t('expertStation.nav.logout') }}
          </button>
        </nav>
        <div class="text-sm text-white/80">
          {{ displayName }}
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
