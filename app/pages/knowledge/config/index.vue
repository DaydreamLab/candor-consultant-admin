<script setup lang="ts">
import { AdminApiError, adminGetKnowledgeConfig } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'
import { readConfigTopK } from '~/utils/knowledge-overview'

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
      value,
      display: formatValue(value)
    }))
})

const configTopK = computed(() => readConfigTopK(settings.value))

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
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.config.title')"
    :description="$t('knowledge.config.subtitle')"
    plain
  >
    <KnowledgeTabs />

    <p
      v-if="configTopK != null"
      class="mb-4 text-sm text-muted"
    >
      {{ $t('knowledge.config.topKHint', { value: configTopK }) }}
    </p>

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
      class="grid max-w-3xl gap-4 text-sm"
    >
      <div
        v-for="row in displayEntries"
        :key="row.key"
        class="rounded-xl border border-default bg-elevated p-4"
      >
        <dt class="mb-2 font-mono text-xs text-muted">
          {{ row.key }}
        </dt>
        <dd
          class="break-all whitespace-pre-wrap font-mono text-xs"
          :class="typeof row.value === 'object' ? 'rounded-lg bg-muted/30 p-3' : ''"
        >
          {{ row.display }}
        </dd>
      </div>
    </dl>
  </PageHeader>
</template>
