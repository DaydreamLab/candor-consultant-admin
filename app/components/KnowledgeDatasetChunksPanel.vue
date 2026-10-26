<script setup lang="ts">
import { AdminApiError, adminListKnowledgeChunks } from '~/utils/admin-api'
import type { KnowledgeChunk, KnowledgeReviewStatus } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { reviewStatusBadgeColor } from '~/utils/knowledge-labels'
import {
  buildKnowledgeChunkListQuery,
  knowledgeChunkListHasMore,
  KNOWLEDGE_CHUNK_DEFAULT_STATUS,
  KNOWLEDGE_CHUNK_FILTER_ANY as FILTER_ANY,
  KNOWLEDGE_CHUNK_PAGE_SIZE
} from '~/utils/knowledge-chunks-query'

const props = defineProps<{
  datasetId: string
  datasetCode?: string | null
  groupKey?: string | null
}>()

const config = useRuntimeConfig()
const { t } = useI18n()
const localePath = useLocalePath()

const rows = ref<KnowledgeChunk[]>([])
const pending = ref(true)
const errorMessage = ref('')
const filterStatus = ref<string>(KNOWLEDGE_CHUNK_DEFAULT_STATUS)
const offset = ref(0)
const hasMore = ref(false)
let loadSeq = 0

const statusOptions = computed(() => [
  { label: t('knowledge.chunks.filterAny'), value: FILTER_ANY },
  { label: t('knowledge.chunks.status.pending'), value: 'pending' },
  { label: t('knowledge.chunks.status.approved'), value: 'approved' },
  { label: t('knowledge.chunks.status.rejected'), value: 'rejected' },
  { label: t('knowledge.chunks.status.draft'), value: 'draft' },
  { label: t('knowledge.chunks.status.retired'), value: 'retired' }
])

const scopedRows = computed(() => {
  const id = props.datasetId
  const code = props.datasetCode?.trim()
  return rows.value.filter((row) => {
    if (row.dataset_id && row.dataset_id === id) {
      return true
    }
    if (code && row.dataset_code === code) {
      return true
    }
    return false
  })
})

const showClientScopeHint = computed(() => {
  return Boolean(props.datasetId) && !props.groupKey?.trim()
})

onMounted(() => {
  watch(
    () => [props.datasetId, props.groupKey, filterStatus.value] as const,
    () => {
      void load(true)
    },
    { immediate: true }
  )
})

async function load(reset: boolean) {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token || !props.datasetId) {
    rows.value = []
    hasMore.value = false
    errorMessage.value = props.datasetId ? t('knowledge.datasets.detail.chunksLoadFailed') : ''
    pending.value = false
    return
  }
  if (reset) {
    offset.value = 0
    rows.value = []
    hasMore.value = false
  }
  pending.value = true
  errorMessage.value = ''
  const query = buildKnowledgeChunkListQuery({
    group: props.groupKey,
    filterStatus: filterStatus.value,
    limit: KNOWLEDGE_CHUNK_PAGE_SIZE,
    offset: offset.value
  })
  try {
    const list = await adminListKnowledgeChunks(config.public.apiBase, token, query)
    if (seq !== loadSeq) {
      return
    }
    rows.value = reset ? list : [...rows.value, ...list]
    hasMore.value = knowledgeChunkListHasMore(list.length, KNOWLEDGE_CHUNK_PAGE_SIZE)
    offset.value += list.length
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    if (reset) {
      rows.value = []
      hasMore.value = false
    }
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.datasets.detail.chunksLoadFailed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function loadMore() {
  if (pending.value || !hasMore.value) {
    return
  }
  void load(false)
}

function statusLabel(status: KnowledgeReviewStatus | '') {
  if (!status) {
    return t('status.na')
  }
  return t(`knowledge.chunks.status.${status}`)
}

function isSummary(row: KnowledgeChunk) {
  const kind = row.chunk_kind?.toLowerCase() ?? ''
  return kind.includes('summary')
}

function cellText(value: string | null | undefined) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || '—'
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">
          {{ $t('knowledge.datasets.detail.chunksSectionTitle') }}
        </h2>
        <UFormField
          :label="$t('knowledge.chunks.filterStatus')"
          class="min-w-[10rem]"
        >
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            value-key="value"
            label-key="label"
            size="sm"
          />
        </UFormField>
      </div>
    </template>

    <UAlert
      v-if="showClientScopeHint"
      color="info"
      variant="subtle"
      class="mb-4"
      :title="$t('knowledge.datasets.detail.chunksClientScopeTitle')"
      :description="$t('knowledge.datasets.detail.chunksClientScopeHint')"
    />

    <p
      v-if="pending && !rows.length"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.chunks.loading') }}
    </p>
    <p
      v-else-if="errorMessage && !rows.length"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <EmptyPanel
      v-else-if="!scopedRows.length"
      :title="$t('knowledge.datasets.detail.chunksEmptyTitle')"
      :description="$t('knowledge.datasets.detail.chunksEmpty')"
    />
    <template v-else>
      <p class="mb-3 text-xs text-muted">
        {{ $t('knowledge.datasets.detail.chunksShowing', { filtered: scopedRows.length, loaded: rows.length }) }}
      </p>
      <AdminTable compact>
        <template #head>
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.chunks.columns.status') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.chunks.columns.preview') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.chunks.columns.sourceUrl') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.chunks.columns.license') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.chunks.columns.attribution') }}
            </th>
            <th class="px-4 py-3 font-medium text-end">
              {{ $t('col.actions') }}
            </th>
          </tr>
        </template>
        <tr
          v-for="row in scopedRows"
          :key="row.id"
          class="border-b border-default last:border-0 align-top"
        >
          <td class="px-4 py-3">
            <div class="flex flex-col gap-1">
              <UBadge
                size="sm"
                variant="soft"
                :color="reviewStatusBadgeColor(row.review_status)"
              >
                {{ statusLabel(row.review_status) }}
              </UBadge>
              <span
                v-if="isSummary(row)"
                class="text-xs text-muted"
              >
                {{ $t('knowledge.chunks.summaryDerived') }}
              </span>
              <p class="font-mono text-xs text-muted break-all">
                {{ row.id || '—' }}
              </p>
            </div>
          </td>
          <td class="px-4 py-3 text-sm">
            <p
              v-if="row.document_title"
              class="mb-1 font-medium"
            >
              {{ row.document_title }}
            </p>
            <p class="whitespace-pre-wrap text-muted max-w-sm">
              {{ cellText(row.text_preview) }}
            </p>
          </td>
          <td class="px-4 py-3 text-sm">
            <a
              v-if="row.source_url"
              :href="row.source_url"
              class="text-primary underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t('knowledge.chunks.sourceLink') }}</a>
            <span
              v-else
              class="text-muted"
            >—</span>
          </td>
          <td class="px-4 py-3 text-sm">
            {{ cellText(row.license) }}
          </td>
          <td class="px-4 py-3 text-sm">
            {{ cellText(row.attribution) }}
          </td>
          <td class="px-4 py-3 text-end">
            <UButton
              :to="localePath(`/knowledge/audit/chunks/${row.id}`)"
              variant="link"
              size="xs"
              class="px-0"
            >
              {{ $t('knowledge.audit.viewChunkAudit') }}
            </UButton>
          </td>
        </tr>
      </AdminTable>
      <div
        v-if="hasMore"
        class="mt-4 flex justify-center"
      >
        <UButton
          variant="outline"
          size="sm"
          :loading="pending"
          @click="loadMore"
        >
          {{ $t('knowledge.chunks.loadMore') }}
        </UButton>
      </div>
    </template>
  </UCard>
</template>
