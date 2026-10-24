<script setup lang="ts">
import { AdminApiError, adminListKnowledgeChunks } from '~/utils/admin-api'
import type { KnowledgeChunk, KnowledgeReviewStatus } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { reviewStatusBadgeColor } from '~/utils/knowledge-labels'
import {
  buildKnowledgeChunkListQuery,
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
    hasMore.value = list.length >= KNOWLEDGE_CHUNK_PAGE_SIZE
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
      <div class="space-y-3">
        <article
          v-for="row in scopedRows"
          :key="row.id"
          class="rounded-lg border border-default bg-elevated p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <p class="font-mono text-xs text-muted break-all">
              {{ row.id }}
            </p>
            <UBadge
              size="sm"
              variant="soft"
              :color="reviewStatusBadgeColor(row.review_status)"
            >
              {{ statusLabel(row.review_status) }}
            </UBadge>
          </div>
          <p
            v-if="row.document_title"
            class="mt-2 text-sm font-medium"
          >
            {{ row.document_title }}
          </p>
          <p
            v-if="isSummary(row)"
            class="mt-1 text-xs text-muted"
          >
            {{ $t('knowledge.chunks.summaryDerived') }}
          </p>
          <p class="mt-2 text-sm whitespace-pre-wrap text-default">
            {{ row.text_preview || '—' }}
          </p>
          <p
            v-if="row.source_url || row.license"
            class="mt-2 text-xs"
          >
            <a
              v-if="row.source_url"
              :href="row.source_url"
              class="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >{{ $t('knowledge.chunks.sourceLink') }}</a>
            <span
              v-if="row.license"
              class="text-muted"
            >{{ row.source_url ? ' · ' : '' }}{{ row.license }}</span>
          </p>
          <p
            v-if="row.attribution"
            class="mt-1 text-xs text-muted"
          >
            {{ row.attribution }}
          </p>
          <UButton
            :to="localePath(`/knowledge/audit/chunks/${row.id}`)"
            variant="link"
            size="xs"
            class="mt-2 px-0"
          >
            {{ $t('knowledge.audit.viewChunkAudit') }}
          </UButton>
        </article>
      </div>
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
