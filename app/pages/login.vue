<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { joinURL } from 'ufo'
import { AdminApiError } from '~/utils/admin-api'
import { writeOperatorSession } from '~/utils/operator-session'
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
const copiedField = ref<string | null>(null)

const demoAccounts = [
  {
    id: 'younger',
    name: 'younger',
    role: 'ops',
    email: 'younger@candor.dev',
    password: 'younger1234'
  },
  {
    id: 'admin',
    name: 'candor',
    role: 'admin',
    email: 'admin@candor.dev',
    password: 'candor1234'
  }
] as const

/** Full browser path including app.baseURL (required on GitHub Pages project sites). */
function appHref(path: string) {
  return joinURL(runtimeConfig.app.baseURL, path)
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

async function skipLogin() {
  writeOperatorSession({
    token: 'local-bypass',
    expires_in: 8 * 60 * 60,
    operator: {
      id: 'local-bypass',
      role: 'admin',
      email: 'local@candor.dev',
      name: '本地預覽',
      status: 'active',
      last_login_at: null
    }
  }, true)
  session.sync()
  await enterApp()
}

function fillDemoAccount(account: typeof demoAccounts[number]) {
  state.email = account.email
  state.password = account.password
  errorMessage.value = ''
}

async function copyDemoField(account: typeof demoAccounts[number], field: 'email' | 'password') {
  const value = account[field]
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const input = document.createElement('textarea')
    input.value = value
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    document.body.appendChild(input)
    input.select()
    const copied = document.execCommand('copy')
    input.remove()
    if (!copied) {
      return
    }
  }
  copiedField.value = `${account.id}:${field}`
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
      <UButton
        type="button"
        block
        size="lg"
        color="neutral"
        variant="outline"
        @click="skipLogin"
      >
        {{ $t('login.skip') }}
      </UButton>
    </UForm>

    <!-- Temporary demo hint. Delete this section when the shortcut is no longer needed. -->
    <section class="mt-8 space-y-3">
      <div>
        <h2 class="text-sm font-medium text-highlighted">
          {{ $t('login.demo.title') }}
        </h2>
        <p class="mt-1 text-xs text-muted">
          {{ $t('login.demo.note') }}
        </p>
      </div>
      <div
        v-for="account in demoAccounts"
        :key="account.id"
        class="rounded-xl border border-dashed border-default p-4"
      >
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <dt class="text-muted">
              {{ $t('login.demo.name') }}
            </dt>
            <dd class="font-medium text-highlighted">
              {{ account.name }}
              <span class="font-normal text-muted">· {{ $t(`roles.${account.role}`) }}</span>
            </dd>
          </div>
          <div
            v-for="field in (['email', 'password'] as const)"
            :key="field"
            class="flex items-center justify-between gap-3"
          >
            <dt class="text-muted">
              {{ $t(field === 'email' ? 'login.demo.account' : 'login.demo.password') }}
            </dt>
            <dd class="flex min-w-0 items-center gap-2">
              <span class="truncate font-mono text-highlighted">
                {{ account[field] }}
              </span>
              <UButton
                type="button"
                size="xs"
                color="neutral"
                variant="ghost"
                :icon="copiedField === `${account.id}:${field}` ? 'i-lucide-check' : 'i-lucide-copy'"
                :label="copiedField === `${account.id}:${field}` ? $t('login.demo.copied') : $t('login.demo.copy')"
                @click="copyDemoField(account, field)"
              />
            </dd>
          </div>
        </dl>
        <UButton
          type="button"
          class="mt-4"
          block
          color="neutral"
          variant="outline"
          icon="i-lucide-clipboard-paste"
          @click="fillDemoAccount(account)"
        >
          {{ $t('login.demo.fill') }}
        </UButton>
      </div>
    </section>
  </div>
</template>
