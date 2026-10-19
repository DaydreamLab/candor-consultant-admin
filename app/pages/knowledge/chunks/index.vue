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

const FILTER_ANY = 'all'

const config = useRuntimeConfig()
const { t } = useI18n()
const session = useSessionStore()
const localePath = useLocalePath()
const { filterGroup, groupSelectItems, groupQueryValue, groupsError } = useKnowledgeDatasetGroupFilter()

const rows = ref<KnowledgeChunk[]>([])
const pending = ref(true)
const errorMessage = ref('')
const filterStatus = ref<string>(FILTER_ANY)
const actionError = ref('')
const actingId = ref<string | null>(null)
const rejectOpen = ref(false)
const rejectTarget = ref<KnowledgeChunk | null>(null)
const rejectReason = ref('')
let loadSeq = 0

const statusOptions = computed(() => [
  { label: t('knowledge.chunks.filterAny'), value: FILTER_ANY },
  { label: t('knowledge.chunks.status.pending'), value: 'pending' },
  { label: t('knowledge.chunks.status.approved'), value: 'approved' },
  { label: t('knowledge.chunks.status.rejected'), value: 'rejected' },
  { label: t('knowledge.chunks.status.draft'), value: 'draft' },
  { label: t('knowledge.chunks.status.retired'), value: 'retired' }
])

/** UI 對已登入 operator 顯示；API 依 OpenAPI 僅 expert／admin 可 approve／reject。 */
const canReview = computed(() => session.isLoggedIn)

const reviewRoleHint = computed(() => {
  const role = session.operator?.role
  if (role === 'ops') {
    return t('knowledge.chunks.reviewRoleOps')
  }
  return ''
})

const displayRows = computed(() => {
  let list = rows.value
  if (filterStatus.value !== FILTER_ANY) {
    list = list.filter(row => row.review_status === filterStatus.value)
  }
  return list
})

const pendingFilterNoMatches = computed(() => {
  if (filterStatus.value !== 'pending' || pending.value || !rows.value.length) {
    return false
  }
  return displayRows.value.length === 0
})

if (import.meta.client) {
  watch([filterGroup], () => {
    void load()
  }, { immediate: true })
}

async function load() {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    rows.value = []
    errorMessage.value = t('knowledge.chunks.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    const query = groupQueryValue.value ? { group: groupQueryValue.value } : {}
    const list = await adminListKnowledgeChunks(config.public.apiBase, token, query)
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
      : t('knowledge.chunks.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
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
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.chunks.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <UAlert
      v-else-if="pendingFilterNoMatches"
      color="info"
      variant="subtle"
      class="mb-4"
      :title="$t('knowledge.chunks.pendingFilterEmptyTitle')"
      :description="$t('knowledge.chunks.pendingFilterEmpty', { count: rows.length })"
    />
    <EmptyPanel
      v-else-if="!displayRows.length"
      :title="$t('knowledge.chunks.emptyTitle')"
      :description="$t('knowledge.chunks.empty')"
    />
    <div
      v-else
      class="space-y-3"
    >
      <UCard
        v-for="row in displayRows"
        :key="row.id"
        class="bg-elevated"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-2">
            <p class="font-mono text-xs text-muted">
              {{ $t('knowledge.chunks.chunkId') }}: {{ row.id }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
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
            </div>
            <p
              v-if="row.reject_reason"
              class="text-xs text-warning"
            >
              {{ $t('knowledge.chunks.rejectReasonStored') }}: {{ row.reject_reason }}
            </p>
            <p class="text-sm font-medium">
              {{ row.document_title || row.dataset_name || row.dataset_code || '—' }}
            </p>
            <p class="text-sm text-muted whitespace-pre-wrap">
              {{ row.text_preview || '—' }}
            </p>
            <p
              v-if="row.source_url"
              class="text-xs"
            >
              <a
                :href="row.source_url"
                class="text-primary underline"
                target="_blank"
                rel="noopener noreferrer"
              >{{ $t('knowledge.chunks.sourceLink') }}</a>
              <span
                v-if="row.license"
                class="text-muted"
              > · {{ row.license }}</span>
            </p>
            <p
              v-if="row.attribution"
              class="text-xs text-muted"
            >
              {{ row.attribution }}
            </p>
            <UButton
              :to="localePath(`/knowledge/audit/chunks/${row.id}`)"
              variant="link"
              size="xs"
              class="px-0"
            >
              {{ $t('knowledge.audit.viewChunkAudit') }}
            </UButton>
          </div>
          <div
            v-if="canReview && row.review_status === 'pending'"
            class="flex shrink-0 flex-col items-end gap-2"
          >
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
          </div>
        </div>
      </UCard>
    </div>

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
