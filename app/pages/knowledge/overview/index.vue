<script setup lang="ts">
import { AdminApiError, adminGetKnowledgeOverview } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const { t } = useI18n()

const overview = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const errorMessage = ref('')

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    overview.value = null
    errorMessage.value = t('knowledge.overview.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    overview.value = await adminGetKnowledgeOverview(config.public.apiBase, token)
  } catch (error) {
    overview.value = null
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.overview.failed')
  } finally {
    pending.value = false
  }
}

const datasetRows = computed(() => {
  const data = overview.value
  if (!data) {
    return []
  }
  if (Array.isArray(data.datasets)) {
    return data.datasets.filter(row => row && typeof row === 'object') as Record<string, unknown>[]
  }
  if (Array.isArray(data.items)) {
    return data.items.filter(row => row && typeof row === 'object') as Record<string, unknown>[]
  }
  return []
})
</script>

<template>
  <PageHeader
    :title="$t('knowledge.overview.title')"
    :description="$t('knowledge.overview.subtitle')"
  >
    <KnowledgeTabs />

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.overview.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <EmptyPanel
      v-else-if="!datasetRows.length"
      :title="$t('knowledge.overview.emptyTitle')"
      :description="$t('knowledge.overview.empty')"
    />
    <div
      v-else
      class="overflow-x-auto rounded-lg border border-default"
    >
      <table class="min-w-full text-sm">
        <thead class="bg-muted/40 text-left text-muted">
          <tr>
            <th class="px-3 py-2 font-medium">
              {{ $t('knowledge.datasets.columns.code') }}
            </th>
            <th class="px-3 py-2 font-medium">
              {{ $t('knowledge.datasets.columns.name') }}
            </th>
            <th class="px-3 py-2 font-medium">
              {{ $t('knowledge.datasets.detail.documents') }}
            </th>
            <th class="px-3 py-2 font-medium">
              {{ $t('knowledge.datasets.detail.chunks') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in datasetRows"
            :key="String(row.id ?? row.code ?? index)"
            class="border-t border-default"
          >
            <td class="px-3 py-2 font-mono text-xs">
              {{ row.code ?? '—' }}
            </td>
            <td class="px-3 py-2">
              {{ row.name ?? '—' }}
            </td>
            <td class="px-3 py-2">
              {{ row.document_count ?? '—' }}
            </td>
            <td class="px-3 py-2">
              {{ row.chunk_count ?? '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageHeader>
</template>
