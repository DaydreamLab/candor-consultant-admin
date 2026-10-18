<script setup lang="ts">
import { AdminApiError, adminListKnowledgeDatasets } from '~/utils/admin-api'
import type { KnowledgeDataset, KnowledgeDatasetStatus } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'

const FILTER_ANY = 'all'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const rows = ref<KnowledgeDataset[]>([])
const pending = ref(true)
const errorMessage = ref('')
const filterStatus = ref<string>(FILTER_ANY)
const filterGroup = ref('')
let loadSeq = 0

const statusOptions = computed(() => [
  { label: t('knowledge.datasets.filterAny'), value: FILTER_ANY },
  { label: t('knowledge.datasets.status.pending_review'), value: 'pending_review' },
  { label: t('knowledge.datasets.status.active'), value: 'active' },
  { label: t('knowledge.datasets.status.disabled'), value: 'disabled' }
])

if (import.meta.client) {
  watch([filterStatus, filterGroup], () => {
    void load()
  }, { immediate: true })
}

async function load() {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    rows.value = []
    errorMessage.value = t('knowledge.datasets.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    const query: { group?: string, status?: KnowledgeDatasetStatus } = {}
    if (filterGroup.value.trim()) {
      query.group = filterGroup.value.trim()
    }
    if (filterStatus.value !== FILTER_ANY) {
      query.status = filterStatus.value as KnowledgeDatasetStatus
    }
    const list = await adminListKnowledgeDatasets(config.public.apiBase, token, query)
    if (seq !== loadSeq) {
      return
    }
    rows.value = list
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    rows.value = []
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.datasets.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function statusLabel(status: KnowledgeDatasetStatus) {
  return t(`knowledge.datasets.status.${status}`)
}

function allowThirdPartyLabel(value: boolean | null | undefined) {
  if (value === true) {
    return t('knowledge.datasets.allowThirdParty.yes')
  }
  if (value === false) {
    return t('knowledge.datasets.allowThirdParty.no')
  }
  return t('knowledge.datasets.allowThirdParty.undecided')
}

function openRow(row: KnowledgeDataset) {
  if (!row.id) {
    return
  }
  void navigateTo(localePath(`/knowledge/datasets/${encodeURIComponent(row.id)}`))
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.datasets.title')"
    :description="$t('knowledge.datasets.subtitle')"
  >
    <KnowledgeTabs />

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <UFormField
        :label="$t('knowledge.datasets.filterStatus')"
        class="w-48"
      >
        <USelect
          v-model="filterStatus"
          :items="statusOptions"
          value-key="value"
          label-key="label"
        />
      </UFormField>
      <UFormField
        :label="$t('knowledge.datasets.filterGroup')"
        class="w-48"
      >
        <UInput
          v-model="filterGroup"
          :placeholder="$t('knowledge.datasets.filterGroupPlaceholder')"
        />
      </UFormField>
    </div>

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.datasets.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <EmptyPanel
      v-else-if="!rows.length"
      :title="$t('knowledge.datasets.emptyTitle')"
      :description="$t('knowledge.datasets.empty')"
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
              {{ $t('knowledge.datasets.columns.status') }}
            </th>
            <th class="px-3 py-2 font-medium">
              {{ $t('knowledge.datasets.columns.chunks') }}
            </th>
            <th class="px-3 py-2 font-medium">
              {{ $t('knowledge.datasets.columns.allowThirdParty') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="cursor-pointer border-t border-default hover:bg-muted/20"
            @click="openRow(row)"
          >
            <td class="px-3 py-2 font-mono text-xs">
              {{ row.code || '—' }}
            </td>
            <td class="px-3 py-2">
              {{ row.name || '—' }}
            </td>
            <td class="px-3 py-2">
              <StatusBadge
                v-if="row.status"
                :label="statusLabel(row.status)"
              />
            </td>
            <td class="px-3 py-2">
              {{ row.chunk_count ?? '—' }}
            </td>
            <td class="px-3 py-2 text-muted">
              {{ allowThirdPartyLabel(row.allow_third_party) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageHeader>
</template>
