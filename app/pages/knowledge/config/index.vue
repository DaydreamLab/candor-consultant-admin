<script setup lang="ts">
import { AdminApiError, adminGetKnowledgeConfig } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const { t } = useI18n()

const settings = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const errorMessage = ref('')

const displayEntries = computed(() => {
  if (!settings.value) {
    return []
  }
  const hidden = new Set(['api_key', 'secret', 'token', 'password'])
  return Object.entries(settings.value)
    .filter(([key]) => !hidden.has(key.toLowerCase()) && !key.toLowerCase().includes('key'))
    .map(([key, value]) => ({
      key,
      value: formatValue(value)
    }))
})

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    settings.value = null
    errorMessage.value = t('knowledge.config.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    settings.value = await adminGetKnowledgeConfig(config.public.apiBase, token)
  } catch (error) {
    settings.value = null
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.config.failed')
  } finally {
    pending.value = false
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.config.title')"
    :description="$t('knowledge.config.subtitle')"
  >
    <KnowledgeTabs />

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.config.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <EmptyPanel
      v-else-if="!displayEntries.length"
      :title="$t('knowledge.config.emptyTitle')"
      :description="$t('knowledge.config.empty')"
    />
    <dl
      v-else
      class="grid max-w-2xl gap-3 text-sm"
    >
      <div
        v-for="row in displayEntries"
        :key="row.key"
        class="grid grid-cols-[10rem_1fr] gap-3 border-b border-default pb-2"
      >
        <dt class="font-mono text-xs text-muted">
          {{ row.key }}
        </dt>
        <dd class="break-all">
          {{ row.value }}
        </dd>
      </div>
    </dl>
  </PageHeader>
</template>
