<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { AdminApiError } from '~/utils/admin-api'
import { loginSchema } from '~/utils/schemas'
import type { LoginForm } from '~/utils/schemas'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const localePath = useLocalePath()
const session = useSessionStore()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const markSrc = computed(() => withAppBase(runtimeConfig.app.baseURL, '/brand/candor-mark.png'))

const state = reactive<LoginForm>({
  email: '',
  password: '',
  remember_me: false
})
const pending = ref(false)
const errorMessage = ref(
  route.query.reason === 'expert_only' ? t('expertStation.login.expertOnly') : ''
)

function appHref(path: string) {
  const base = String(runtimeConfig.app.baseURL || '/').replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}` || '/'
}

async function enterApp() {
  await nextTick()
  await reloadNuxtApp({
    path: appHref(localePath('/')),
    persistState: false
  })
}

async function onSubmit(event: FormSubmitEvent<LoginForm>) {
  if (pending.value) {
    return
  }
  errorMessage.value = ''
  pending.value = true
  try {
    await session.login(event.data.email, event.data.password, Boolean(event.data.remember_me))
    if (session.operator?.role !== 'expert') {
      session.logout()
      errorMessage.value = t('expertStation.login.expertOnly')
      return
    }
    await enterApp()
  } catch (error) {
    errorMessage.value = describeLoginError(error)
  } finally {
    pending.value = false
  }
}

function describeLoginError(error: unknown) {
  if (error instanceof AdminApiError) {
    if (error.statusCode === 429) {
      return t('expertStation.login.rateLimited')
    }
    if (error.statusCode === 401 || error.statusCode === 422) {
      return t('expertStation.login.invalid')
    }
  }
  return t('expertStation.login.failed')
}
</script>

<template>
  <div class="w-full rounded-2xl border border-default bg-default p-6 shadow-sm">
    <div class="mb-6 flex items-center gap-3">
      <img
        :src="markSrc"
        alt=""
        class="size-10 shrink-0 object-contain"
      >
      <div class="min-w-0">
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t('expertStation.login.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ $t('expertStation.host') }}
        </p>
      </div>
    </div>

    <UForm
      :schema="loginSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        :label="$t('expertStation.login.account')"
        name="email"
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="username"
          :placeholder="$t('expertStation.login.accountPlaceholder')"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="$t('expertStation.login.password')"
        name="password"
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>
      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <UButton
        type="submit"
        block
        color="primary"
        :loading="pending"
      >
        {{ $t('expertStation.login.submit') }}
      </UButton>
      <p class="text-center text-xs text-muted">
        {{ $t('expertStation.login.hint') }}
      </p>
    </UForm>
  </div>
</template>
