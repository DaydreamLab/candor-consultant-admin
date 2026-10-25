<script setup lang="ts">
import { AdminApiError } from '~/utils/admin-api'
import { getPublicPrivacyPolicy, type PrivacyPolicy } from '~/utils/privacy-policy-api'

definePageMeta({
  layout: 'public'
})

const { t } = useI18n()
const config = useRuntimeConfig()
const localePath = useLocalePath()

const policy = ref<PrivacyPolicy | null>(null)
const pending = ref(true)
const error = ref('')

useHead({
  title: computed(() => policy.value?.title?.trim() || t('privacyPolicy.pageTitle'))
})

if (import.meta.client) {
  void load()
}

async function load() {
  pending.value = true
  error.value = ''
  try {
    policy.value = await getPublicPrivacyPolicy(config.public.apiBase)
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('privacyPolicy.loadFailed')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <p class="mb-4">
      <NuxtLink
        class="text-sm text-muted underline underline-offset-2 hover:text-default"
        :to="localePath('/login')"
      >
        {{ $t('privacyPolicy.backToLogin') }}
      </NuxtLink>
    </p>

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('privacyPolicy.loading') }}
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <article
      v-else-if="policy"
      data-testid="privacy-policy-public"
    >
      <p class="text-sm text-muted">
        {{ $t('privacyPolicy.versionLabel', { version: policy.version }) }}
        <template v-if="policy.updated_at">
          · {{ $t('privacyPolicy.updatedAt', { at: policy.updated_at }) }}
        </template>
      </p>
      <div class="mt-6">
        <MarkdownPreview
          :title="policy.title"
          :source="policy.body"
        />
      </div>
    </article>
  </div>
</template>
