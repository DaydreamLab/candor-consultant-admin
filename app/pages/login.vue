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
const runtimeConfig = useRuntimeConfig()

const state = reactive<LoginForm>({
  email: '',
  password: '',
  remember_me: false
})
const pending = ref(false)
const errorMessage = ref('')

/** Full browser path including app.baseURL (required on GitHub Pages project sites). */
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
      return t('login.rateLimited')
    }
    if (error.statusCode === 401 || error.statusCode === 422) {
      return t('login.invalid')
    }
  }
  return t('login.failed')
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ $t('login.title') }}
    </h1>
    <p class="mt-2 text-base text-muted">
      {{ $t('login.description') }}
    </p>

    <UForm
      :schema="loginSchema"
      :state="state"
      class="mt-8 space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        name="email"
        :label="$t('login.email')"
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="username"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="password"
        :label="$t('login.password')"
      >
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UCheckbox
        v-model="state.remember_me"
        name="remember_me"
        :label="$t('login.rememberMe')"
      />

      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>

      <UButton
        type="submit"
        block
        size="lg"
        :loading="pending"
      >
        {{ $t('login.submit') }}
      </UButton>
    </UForm>
  </div>
</template>
