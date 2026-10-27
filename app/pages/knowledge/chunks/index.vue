<script setup lang="ts">
import {
  AdminApiError,
  adminApproveKnowledgeChunk,
  adminListKnowledgeChunks,
  adminRejectKnowledgeChunk
} from '~/utils/admin-api'
import type { KnowledgeChunk, KnowledgeReviewStatus } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { useKnowledgeDatasetGroupFilter } from '~/composables/useKnowledgeDatasetGroupFilter'
import { reviewStatusBadgeColor } from '~/utils/knowledge-labels'
import {
  buildKnowledgeChunkListQuery,
  knowledgeChunkListHasMore,
  KNOWLEDGE_CHUNK_DEFAULT_STATUS,
  KNOWLEDGE_CHUNK_FILTER_ANY as FILTER_ANY,
  KNOWLEDGE_CHUNK_PAGE_SIZE
} from '~/utils/knowledge-chunks-query'
import { canReviewKnowledgeChunks } from '~/utils/knowledge-access'

const STATUS_FILTERS = new Set([
  'pending',
  'approved',
  'rejected',
  'draft',
  'retired',
  FILTER_ANY
])

const config = useRuntimeConfig()
const { t } = useI18n()
const session = useSessionStore()
const localePath = useLocalePath()
const route = useRoute()
const { filterGroup, groupSelectItems, groupQueryValue, groupsError } = useKnowledgeDatasetGroupFilter()

const rows = ref<KnowledgeChunk[]>([])
const pending = ref(true)
const errorMessage = ref('')

function statusFromQuery() {
  const raw = route.query.status
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  if (typeof value === 'string' && STATUS_FILTERS.has(value)) {
    return value
  }
  return KNOWLEDGE_CHUNK_DEFAULT_STATUS
}

const filterStatus = ref<string>(statusFromQuery())
const actionError = ref('')
const actingId = ref<string | null>(null)
const rejectOpen = ref(false)
const rejectTarget = ref<KnowledgeChunk | null>(null)
const rejectReason = ref('')
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

/** 核可／退回僅 ops／admin（與 candor-core 知識管理權限對齊）。 */
const canReview = computed(() => canReviewKnowledgeChunks(session.operator?.role))

const reviewRoleHint = computed(() => {
  if (canReview.value) {
    return ''
  }
  return t('knowledge.chunks.reviewRoleDenied')
})

onMounted(() => {
  watch([filterGroup, filterStatus], () => {
    void load(true)
  }, { immediate: true })
})

async function load(reset: boolean) {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    rows.value = []
    hasMore.value = false
    errorMessage.value = t('knowledge.chunks.failed')
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
  try {
    // OpenAPI today: limit + offset. Query builder also accepts cursor if core adds it later.
    const query = buildKnowledgeChunkListQuery({
      group: groupQueryValue.value,
      filterStatus: filterStatus.value,
      limit: KNOWLEDGE_CHUNK_PAGE_SIZE,
      offset: offset.value
    })
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
      : t('knowledge.chunks.failed')
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

function documentLabel(row: KnowledgeChunk) {
  return cellText(row.document_title || row.dataset_name || row.dataset_code)
}

async function approve(row: KnowledgeChunk) {
  const token = readOperatorToken()
  if (!token || !canReview.value || actingId.value) {
    return
  }
  actingId.value = row.id
  actionError.value = ''
  try {
    const updated = await adminApproveKnowledgeChunk(config.public.apiBase, token, row.id)
    rows.value = rows.value.map(item => (item.id === updated.id ? updated : item))
  } catch (error) {
    actionError.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.chunks.approveFailed')
  } finally {
    actingId.value = null
  }
}

function openReject(row: KnowledgeChunk) {
  rejectTarget.value = row
  rejectReason.value = ''
  actionError.value = ''
  rejectOpen.value = true
}

async function confirmReject() {
  const token = readOperatorToken()
  const row = rejectTarget.value
  const reason = rejectReason.value.trim()
  if (!token || !row || !canReview.value || !reason || actingId.value) {
    return
  }
  actingId.value = row.id
  actionError.value = ''
  try {
    const updated = await adminRejectKnowledgeChunk(config.public.apiBase, token, row.id, { reason })
    rows.value = rows.value.map(item => (item.id === updated.id ? updated : item))
    rejectOpen.value = false
  } catch (error) {
    actionError.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.chunks.rejectFailed')
  } finally {
    actingId.value = null
  }
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.chunks.title')"
    :description="$t('knowledge.chunks.subtitle')"
    plain
  >
    <KnowledgeTabs />

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div class="min-w-40">
        <label class="mb-1 block text-xs text-muted">
          {{ $t('knowledge.chunks.filterStatus') }}
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
      v-if="reviewRoleHint"
      class="mb-3 text-sm text-muted"
    >
      {{ reviewRoleHint }}
    </p>

    <p
      v-if="actionError"
      class="mb-3 text-sm text-error"
    >
      {{ actionError }}
    </p>

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
      v-else-if="!rows.length"
      :title="$t('knowledge.chunks.emptyTitle')"
      :description="$t('knowledge.chunks.empty')"
    />
    <template v-else>
      <AdminTable compact>
        <template #head>
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.chunks.columns.status') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('knowledge.chunks.columns.document') }}
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
          v-for="row in rows"
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
              <p
                v-if="row.reject_reason"
                class="text-xs text-warning"
              >
                {{ $t('knowledge.chunks.rejectReasonStored') }}: {{ row.reject_reason }}
              </p>
            </div>
          </td>
          <td class="px-4 py-3">
            <p class="text-sm font-medium">
              {{ documentLabel(row) }}
            </p>
            <p class="mt-1 font-mono text-xs text-muted break-all">
              {{ row.id || '—' }}
            </p>
          </td>
          <td class="px-4 py-3 text-sm text-muted whitespace-pre-wrap max-w-sm">
            {{ cellText(row.text_preview) }}
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
          <td class="px-4 py-3">
            <div class="flex flex-col items-end gap-2">
              <template v-if="canReview && row.review_status === 'pending'">
                <UButton
                  size="sm"
                  color="primary"
                  :loading="actingId === row.id"
                  @click="approve(row)"
                >
                  {{ $t('knowledge.chunks.approve') }}
                </UButton>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  :disabled="actingId === row.id"
                  @click="openReject(row)"
                >
                  {{ $t('knowledge.chunks.reject') }}
                </UButton>
              </template>
              <UButton
                :to="localePath(`/knowledge/audit/chunks/${row.id}`)"
                variant="link"
                size="xs"
                class="px-0"
              >
                {{ $t('knowledge.audit.viewChunkAudit') }}
              </UButton>
            </div>
          </td>
        </tr>
      </AdminTable>
      <div
        v-if="hasMore"
        class="mt-4 flex justify-center"
      >
        <UButton
          variant="outline"
          :loading="pending"
          @click="loadMore"
        >
          {{ $t('knowledge.chunks.loadMore') }}
        </UButton>
      </div>
    </template>

    <UModal v-model:open="rejectOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">
              {{ $t('knowledge.chunks.rejectTitle') }}
            </h3>
          </template>
          <UFormField
            :label="$t('knowledge.chunks.rejectReason')"
            required
          >
            <UTextarea
              v-model="rejectReason"
              :rows="4"
            />
          </UFormField>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                @click="rejectOpen = false"
              >
                {{ $t('actions.cancel') }}
              </UButton>
              <UButton
                color="error"
                :disabled="!rejectReason.trim()"
                :loading="Boolean(actingId)"
                @click="confirmReject"
              >
                {{ $t('knowledge.chunks.rejectConfirm') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </PageHeader>
</template>
