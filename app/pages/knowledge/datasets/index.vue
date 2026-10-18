<script setup lang="ts">
import { AdminApiError, adminListKnowledgeDatasets } from '~/utils/admin-api'
import type { KnowledgeDataset, KnowledgeDatasetStatus } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { useKnowledgeDatasetGroupFilter } from '~/composables/useKnowledgeDatasetGroupFilter'
import {
  allowThirdPartyBadgeColor,
  datasetStatusBadgeColor
} from '~/utils/knowledge-labels'

const FILTER_ANY = 'all'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const { filterGroup, groupSelectItems, groupQueryValue, groupsError } = useKnowledgeDatasetGroupFilter()

const rows = ref<KnowledgeDataset[]>([])
const pending = ref(true)
const errorMessage = ref('')
const filterStatus = ref<string>(FILTER_ANY)
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
    const group = groupQueryValue.value
    if (group) {
      query.group = group
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

function statusLabel(status: KnowledgeDatasetStatus | '') {
  if (!status) {
    return t('status.na')
  }
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
    plain
  >
    <KnowledgeTabs />

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div class="min-w-40">
        <label class="mb-1 block text-xs text-muted">
          {{ $t('knowledge.datasets.filterStatus') }}
        </label>
        <USelect
          v-model="filterStatus"
          :items="statusOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </div>
      <div class="min-w-52">
        <label class="mb-1 block text-xs text-muted">
          {{ $t('knowledge.datasets.filterGroup') }}
        </label>
        <USelect
          v-model="filterGroup"
          :items="groupSelectItems"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </div>
    </div>

    <p
      v-if="groupsError"
      class="mb-3 text-sm text-warning"
    >
      {{ groupsError }}
    </p>
    <p
      v-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="pending && !rows.length"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.datasets.loading') }}
    </p>
    <p
      v-else-if="!pending && !rows.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('knowledge.datasets.empty') }}
    </p>
    <AdminTable
      v-else
      compact
    >
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasets.columns.code') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasets.columns.name') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasets.columns.status') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasets.columns.chunks') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasets.columns.allowThirdParty') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.id"
        class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
        @click="openRow(row)"
      >
        <td class="px-4 py-3 font-mono text-xs">
          {{ row.code || '—' }}
        </td>
        <td class="px-4 py-3">
          {{ row.name || '—' }}
        </td>
        <td class="px-4 py-3">
          <UBadge
            v-if="row.status"
            size="sm"
            variant="soft"
            :color="datasetStatusBadgeColor(row.status)"
          >
            {{ statusLabel(row.status) }}
          </UBadge>
          <span
            v-else
            class="text-muted"
          >{{ $t('status.na') }}</span>
        </td>
        <td class="px-4 py-3">
          {{ row.chunk_count ?? '—' }}
        </td>
        <td class="px-4 py-3">
          <UBadge
            size="sm"
            variant="subtle"
            :color="allowThirdPartyBadgeColor(row.allow_third_party)"
          >
            {{ allowThirdPartyLabel(row.allow_third_party) }}
          </UBadge>
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
