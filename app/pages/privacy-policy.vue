<script setup lang="ts">
import { AdminApiError } from '~/utils/admin-api'
import { renderMarkdownToHtml } from '~/utils/markdown-render'
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

const bodyHtml = computed(() => {
  if (!policy.value) {
    return ''
  }
  return renderMarkdownToHtml(policy.value.body)
})

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
      <h1 class="text-2xl font-semibold text-highlighted sm:text-3xl">
        {{ policy.title }}
      </h1>
      <p class="mt-2 text-sm text-muted">
        {{ $t('privacyPolicy.versionLabel', { version: policy.version }) }}
        <template v-if="policy.updated_at">
          · {{ $t('privacyPolicy.updatedAt', { at: policy.updated_at }) }}
        </template>
      </p>
      <!-- bodyHtml is escaped then Markdown-transformed (see markdown-render.ts) -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        class="privacy-md mt-8 space-y-4 text-base leading-relaxed text-default"
        data-testid="privacy-policy-body"
        v-html="bodyHtml"
      />
      <!-- eslint-enable vue/no-v-html -->
    </article>
  </div>
</template>

<style scoped>
.privacy-md :deep(h1),
.privacy-md :deep(h2),
.privacy-md :deep(h3),
.privacy-md :deep(h4) {
  font-weight: 600;
  color: var(--ui-text-highlighted);
  margin-top: 1.5rem;
}
.privacy-md :deep(h1) { font-size: 1.5rem; }
.privacy-md :deep(h2) { font-size: 1.25rem; }
.privacy-md :deep(h3) { font-size: 1.125rem; }
.privacy-md :deep(ul),
.privacy-md :deep(ol) {
  padding-inline-start: 1.25rem;
}
.privacy-md :deep(ul) { list-style: disc; }
.privacy-md :deep(ol) { list-style: decimal; }
.privacy-md :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.privacy-md :deep(code) {
  font-size: 0.875em;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background: color-mix(in oklab, var(--ui-bg-elevated) 80%, transparent);
}
.privacy-md :deep(hr) {
  border: 0;
  border-top: 1px solid var(--ui-border);
  margin: 1.5rem 0;
}
</style>
