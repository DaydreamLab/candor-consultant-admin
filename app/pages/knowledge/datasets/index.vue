<script setup lang="ts">
import {
  AdminApiError,
  adminListKnowledgeDatasetGroups,
  adminListKnowledgeDatasets
} from '~/utils/admin-api'
import type { KnowledgeDataset, KnowledgeDatasetGroup, KnowledgeDatasetStatus } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { datasetStatusBadgeColor, defaultReviewModeBadgeColor } from '~/utils/knowledge-labels'
import { resolveKnowledgeGroupKey } from '~/utils/knowledge-field-parse'

const FILTER_ANY = 'all'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const groups = ref<KnowledgeDatasetGroup[]>([])
const rows = ref<KnowledgeDataset[]>([])
const pending = ref(true)
const groupsError = ref('')
const errorMessage = ref('')
const filterStatus = ref<string>(FILTER_ANY)
const expandedGroup = ref<string | null>(null)
let loadSeq = 0

const statusOptions = computed(() => [
  { label: t('knowledge.datasets.filterAny'), value: FILTER_ANY },
  { label: t('knowledge.datasets.status.pending_review'), value: 'pending_review' },
  { label: t('knowledge.datasets.status.active'), value: 'active' },
  { label: t('knowledge.datasets.status.disabled'), value: 'disabled' }
])

const sortedGroups = computed(() =>
  [...groups.value].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
)

const filteredRows = computed(() => {
  if (filterStatus.value === FILTER_ANY) {
    return rows.value
  }
  return rows.value.filter(row => row.status === filterStatus.value)
})

function datasetsInGroup(groupKey: string) {
  return filteredRows.value.filter(row => resolveKnowledgeGroupKey(row as Record<string, unknown>) === groupKey)
}

function groupDatasetCount(groupKey: string) {
  return datasetsInGroup(groupKey).length
}

if (import.meta.client) {
  watch(filterStatus, () => {
    void loadDatasets()
  })
  void loadGroups()
  void loadDatasets()
}

async function loadGroups() {
  const token = readOperatorToken()
  if (!token) {
    groups.value = []
    groupsError.value = t('knowledge.datasetGroups.failed')
    return
  }
  groupsError.value = ''
  try {
    groups.value = await adminListKnowledgeDatasetGroups(config.public.apiBase, token)
    if (!expandedGroup.value && groups.value.length) {
      expandedGroup.value = groups.value[0]?.group_key ?? null
    }
  } catch (error) {
    groups.value = []
    groupsError.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.datasetGroups.failed')
  }
}

async function loadDatasets() {
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
    const query: { status?: KnowledgeDatasetStatus } = {}
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

function toggleGroup(groupKey: string) {
  expandedGroup.value = expandedGroup.value === groupKey ? null : groupKey
}

function statusLabel(status: KnowledgeDatasetStatus | '') {
  if (!status) {
    return t('status.na')
  }
  return t(`knowledge.datasets.status.${status}`)
}

function reviewModeLabel(mode: string | null | undefined) {
  if (!mode) {
    return t('status.na')
  }
  const key = `knowledge.datasets.reviewMode.${mode}`
  const label = t(key)
  return label === key ? mode : label
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
    <EmptyPanel
      v-else-if="!sortedGroups.length"
      :title="$t('knowledge.datasetGroups.emptyTitle')"
      :description="$t('knowledge.datasetGroups.empty')"
    />
    <div
      v-else
      class="space-y-3"
    >
      <UCard
        v-for="group in sortedGroups"
        :key="group.group_key"
        class="bg-elevated"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 text-left"
          @click="toggleGroup(group.group_key)"
        >
          <div>
            <p class="font-medium">
              {{ group.display_name || group.group_key }}
            </p>
            <p class="text-xs text-muted font-mono">
              {{ group.group_key }}
              · {{ $t('knowledge.datasets.groupDatasetCount', { count: groupDatasetCount(group.group_key) }) }}
            </p>
          </div>
          <UIcon
            :name="expandedGroup === group.group_key ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="size-5 text-muted"
          />
        </button>

        <div
          v-if="expandedGroup === group.group_key"
          class="mt-4 border-t border-default pt-4"
        >
          <p
            v-if="!datasetsInGroup(group.group_key).length"
            class="text-sm text-muted"
          >
            {{ $t('knowledge.datasets.emptyInGroup') }}
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
                  {{ $t('knowledge.datasets.columns.defaultReviewMode') }}
                </th>
                <th class="px-4 py-3 font-medium">
                  {{ $t('knowledge.datasets.columns.attribution') }}
                </th>
                <th class="px-4 py-3 font-medium">
                  {{ $t('knowledge.datasets.columns.chunks') }}
                </th>
              </tr>
            </template>
            <tr
              v-for="row in datasetsInGroup(group.group_key)"
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
              </td>
              <td class="px-4 py-3">
                <UBadge
                  v-if="row.default_review_mode"
                  size="sm"
                  variant="soft"
                  :color="defaultReviewModeBadgeColor(row.default_review_mode)"
                >
                  {{ reviewModeLabel(row.default_review_mode) }}
                </UBadge>
                <span
                  v-else
                  class="text-muted"
                >{{ $t('status.na') }}</span>
              </td>
              <td class="px-4 py-3 text-sm">
                {{ row.attribution || '—' }}
              </td>
              <td class="px-4 py-3">
                {{ row.chunk_count ?? '—' }}
              </td>
            </tr>
          </AdminTable>
        </div>
      </UCard>
    </div>
  </PageHeader>
</template>
