<script setup lang="ts">
import { needsSurfaceChooser, operatorRoles, postLoginHomePath } from '~/utils/operator-roles'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const localePath = useLocalePath()
const session = useSessionStore()
const runtimeConfig = useRuntimeConfig()

const roles = computed(() => operatorRoles(session.operator))

onMounted(() => {
  if (!session.isLoggedIn) {
    void navigateTo(localePath('/login'))
    return
  }
  if (!needsSurfaceChooser(roles.value)) {
    void navigateTo(localePath(postLoginHomePath(roles.value)))
  }
})

useHead({
  title: t('choosePanel.title')
})

function appHref(path: string) {
  const base = String(runtimeConfig.app.baseURL || '/').replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}` || '/'
}

async function enter(path: '/' | '/expert') {
  await nextTick()
  await reloadNuxtApp({
    path: appHref(localePath(path)),
    persistState: false
  })
}
</script>

<template>
  <div
    class="mx-auto max-w-lg"
    data-testid="choose-panel"
  >
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ $t('choosePanel.title') }}
    </h1>
    <p class="mt-2 text-base text-muted">
      {{ $t('choosePanel.description') }}
    </p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        class="flex flex-col items-start gap-2 rounded-xl border border-default bg-elevated/40 p-5 text-left transition hover:border-primary hover:bg-elevated"
        data-testid="choose-panel-admin"
        @click="enter('/')"
      >
        <span class="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UIcon
            name="i-lucide-layout-dashboard"
            class="size-5"
          />
        </span>
        <span class="text-base font-semibold text-highlighted">
          {{ $t('choosePanel.admin.title') }}
        </span>
        <span class="text-sm text-muted">
          {{ $t('choosePanel.admin.description') }}
        </span>
      </button>

      <button
        type="button"
        class="flex flex-col items-start gap-2 rounded-xl border border-default bg-elevated/40 p-5 text-left transition hover:border-primary hover:bg-elevated"
        data-testid="choose-panel-expert"
        @click="enter('/expert')"
      >
        <span class="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UIcon
            name="i-lucide-calendar-heart"
            class="size-5"
          />
        </span>
        <span class="text-base font-semibold text-highlighted">
          {{ $t('choosePanel.expert.title') }}
        </span>
        <span class="text-sm text-muted">
          {{ $t('choosePanel.expert.description') }}
        </span>
      </button>
    </div>
  </div>
</template>
