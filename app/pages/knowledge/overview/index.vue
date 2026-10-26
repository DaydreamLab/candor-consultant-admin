<script setup lang="ts">
import { AdminApiError, adminGetKnowledgeOverview } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'
import {
  extractKnowledgeOverviewTotals,
  extractOverviewDatasetRows,
  formatOverviewReviewCounts,
  overviewHasVisibleContent
} from '~/utils/knowledge-overview'
import { datasetStatusBadgeColor, defaultReviewModeBadgeColor } from '~/utils/knowledge-labels'
import type { KnowledgeDatasetStatus } from '~/types/knowledge'

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

const totals = computed(() => extractKnowledgeOverviewTotals(overview.value ?? {}))

const datasetRows = computed(() => extractOverviewDatasetRows(overview.value ?? {}))

const hasContent = computed(() => overviewHasVisibleContent(overview.value))

function formatTotal(value: number | null) {
  return value == null ? '—' : String(value)
}

function statusLabel(status: unknown) {
  if (typeof status !== 'string' || !status) {
    return t('status.na')
  }
  const key = `knowledge.datasets.status.${status}`
  return t(key) === key ? status : t(key)
}

function reviewModeLabel(mode: unknown) {
  if (typeof mode !== 'string' || !mode) {
    return t('status.na')
  }
  const key = `knowledge.datasets.reviewMode.${mode}`
  const label = t(key)
  return label === key ? mode : label
}

function cellText(value: unknown) {
  if (value == null || value === '') {
    return '—'
  }
  return String(value)
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.overview.title')"
    :description="$t('knowledge.overview.subtitle')"
    plain
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
      v-else-if="!hasContent"
      :title="$t('knowledge.overview.emptyTitle')"
      :description="$t('knowledge.overview.empty')"
    />
    <template v-else>
      <div class="mb-6 grid gap-3 sm:grid-cols-3">
        <UCard class="bg-elevated">
          <p class="text-xs text-muted">
            {{ $t('knowledge.overview.totals.chunks') }}
          </p>
          <p class="text-2xl font-semibold">
            {{ formatTotal(totals.chunks) }}
          </p>
        </UCard>
        <UCard class="bg-elevated">
          <p class="text-xs text-muted">
            {{ $t('knowledge.overview.totals.documents') }}
          </p>
          <p class="text-2xl font-semibold">
            {{ formatTotal(totals.documents) }}
          </p>
        </UCard>
        <UCard class="bg-elevated">
          <p class="text-xs text-muted">
            {{ $t('knowledge.overview.totals.datasetsActive') }}
          </p>
          <p class="text-2xl font-semibold">
            {{ formatTotal(totals.datasetsActive) }}
          </p>
        </UCard>
      </div>

      <h2 class="mb-3 text-sm font-semibold">
        {{ $t('knowledge.overview.datasetsTitle') }}
      </h2>

      <EmptyPanel
        v-if="!datasetRows.length"
        :title="$t('knowledge.overview.datasetsEmptyTitle')"
        :description="$t('knowledge.overview.datasetsEmpty')"
      />
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
              {{ $t('knowledge.datasets.detail.documents') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.datasets.detail.chunks') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.overview.columns.reviewCounts') }}
            </th>
          </tr>
        </template>
        <tr
          v-for="(row, index) in datasetRows"
          :key="String(row.id ?? row.code ?? index)"
          class="border-b border-default last:border-0"
        >
          <td class="px-4 py-3 font-mono text-xs">
            {{ cellText(row.code) }}
          </td>
          <td class="px-4 py-3">
            {{ cellText(row.name) }}
          </td>
          <td class="px-4 py-3">
            <UBadge
              v-if="typeof row.status === 'string' && row.status"
              size="sm"
              variant="soft"
              :color="datasetStatusBadgeColor(row.status as KnowledgeDatasetStatus)"
            >
              {{ statusLabel(row.status) }}
            </UBadge>
            <span
              v-else
              class="text-muted"
            >{{ $t('status.na') }}</span>
          </td>
          <td class="px-4 py-3">
            <UBadge
              v-if="typeof row.default_review_mode === 'string' && row.default_review_mode"
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
            {{ cellText(row.attribution) }}
          </td>
          <td class="px-4 py-3">
            {{ cellText(row.document_count) }}
          </td>
          <td class="px-4 py-3">
            {{ cellText(row.chunk_count) }}
          </td>
          <td class="px-4 py-3 text-xs text-muted">
            {{ formatOverviewReviewCounts(row.chunks_by_review_status) }}
          </td>
        </tr>
      </AdminTable>
    </template>
  </PageHeader>
</template>
