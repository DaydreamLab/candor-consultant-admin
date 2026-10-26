<script setup lang="ts">
import {
  AdminApiError,
  adminGetKnowledgeDataset,
  adminPatchKnowledgeDataset
} from '~/utils/admin-api'
import type { KnowledgeDataset, KnowledgeDatasetPatch, KnowledgeDatasetStatus } from '~/types/knowledge'
import { defaultReviewModeBadgeColor } from '~/utils/knowledge-labels'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const route = useRoute()
const { t } = useI18n()
const session = useSessionStore()
const localePath = useLocalePath()
const toast = useToast()

const datasetId = computed(() => String(route.params.id ?? ''))
const dataset = ref<KnowledgeDataset | null>(null)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const saveSuccess = ref(false)

const draftCode = ref('')
const draftName = ref('')
const draftLicense = ref('')
const draftLicenseUrl = ref('')
const draftAttribution = ref('')
const draftStatus = ref<KnowledgeDatasetStatus>('pending_review')
const draftReason = ref('')

const canEdit = computed(() => session.isLoggedIn)

const statusOptions = computed(() => [
  { label: t('knowledge.datasets.status.pending_review'), value: 'pending_review' },
  { label: t('knowledge.datasets.status.active'), value: 'active' },
  { label: t('knowledge.datasets.status.disabled'), value: 'disabled' }
])

if (import.meta.client) {
  watch(datasetId, (id) => {
    void load(id)
  }, { immediate: true })
}

async function load(id: string) {
  dataset.value = null
  errorMessage.value = ''
  const token = readOperatorToken()
  if (!token || !id) {
    pending.value = false
    errorMessage.value = t('knowledge.datasets.failed')
    return
  }
  pending.value = true
  try {
    const row = await adminGetKnowledgeDataset(config.public.apiBase, token, id)
    if (datasetId.value !== id) {
      return
    }
    dataset.value = row
    syncDraft(row)
  } catch (error) {
    if (datasetId.value !== id) {
      return
    }
    dataset.value = null
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.datasets.failed')
  } finally {
    if (datasetId.value === id) {
      pending.value = false
    }
  }
}

function syncDraft(row: KnowledgeDataset) {
  draftCode.value = row.code ?? ''
  draftName.value = row.name ?? ''
  draftLicense.value = row.license ?? ''
  draftLicenseUrl.value = row.license_url ?? ''
  draftAttribution.value = row.attribution ?? ''
  draftStatus.value = row.status && ['pending_review', 'active', 'disabled'].includes(row.status)
    ? row.status
    : 'pending_review'
  draftReason.value = ''
}

async function save() {
  const token = readOperatorToken()
  const id = datasetId.value
  if (!token || !id || !canEdit.value || saving.value) {
    return
  }
  saving.value = true
  errorMessage.value = ''
  saveSuccess.value = false
  const payload: KnowledgeDatasetPatch = {
    code: draftCode.value.trim(),
    name: draftName.value.trim(),
    license: draftLicense.value.trim() || undefined,
    license_url: draftLicenseUrl.value.trim() || null,
    attribution: draftAttribution.value.trim() || null,
    status: draftStatus.value
  }
  const reason = draftReason.value.trim()
  if (reason) {
    payload.reason = reason
  }
  try {
    const row = await adminPatchKnowledgeDataset(config.public.apiBase, token, id, payload)
    if (datasetId.value !== id) {
      return
    }
    dataset.value = row
    syncDraft(row)
    saveSuccess.value = true
    toast.add({
      title: t('knowledge.datasets.saveOk'),
      color: 'success'
    })
  } catch (error) {
    if (datasetId.value !== id) {
      return
    }
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.datasets.saveFailed')
  } finally {
    if (datasetId.value === id) {
      saving.value = false
    }
  }
}

function reviewCount(key: string) {
  const map = dataset.value?.chunks_by_review_status
  if (!map || typeof map !== 'object') {
    return '—'
  }
  const n = (map as Record<string, unknown>)[key]
  return typeof n === 'number' ? n : '—'
}

function reviewModeLabel(mode: string | null | undefined) {
  if (!mode) {
    return t('status.na')
  }
  const key = `knowledge.datasets.reviewMode.${mode}`
  const label = t(key)
  return label === key ? mode : label
}
</script>

<template>
  <PageHeader
    :title="dataset?.name || dataset?.code || datasetId"
    plain
  >
    <KnowledgeTabs />

    <div
      v-if="dataset && !pending"
      class="mb-4"
    >
      <UButton
        :to="localePath(`/knowledge/audit/datasets/${datasetId}`)"
        variant="outline"
        size="sm"
      >
        {{ $t('knowledge.audit.viewDatasetAudit') }}
      </UButton>
    </div>

    <p
      v-if="errorMessage && !dataset"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.datasets.loading') }}
    </p>
    <template v-else-if="dataset">
      <p
        v-if="errorMessage"
        class="mb-4 text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <UAlert
        v-if="saveSuccess"
        color="success"
        variant="subtle"
        class="mb-4"
        :title="$t('knowledge.datasets.saveOk')"
      />

      <div class="mb-6 grid gap-4 md:grid-cols-2">
        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold">
              {{ $t('knowledge.datasets.detail.stats') }}
            </h2>
          </template>
          <dl class="grid gap-2 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                {{ $t('knowledge.datasets.columns.code') }}
              </dt>
              <dd class="font-mono text-xs">
                {{ dataset.code }}
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                {{ $t('knowledge.datasets.detail.documents') }}
              </dt>
              <dd>{{ dataset.document_count ?? '—' }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                {{ $t('knowledge.datasets.detail.chunks') }}
              </dt>
              <dd>{{ dataset.chunk_count ?? '—' }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                {{ $t('knowledge.datasets.detail.defaultReviewMode') }}
              </dt>
              <dd>
                <UBadge
                  v-if="dataset.default_review_mode"
                  size="sm"
                  variant="soft"
                  :color="defaultReviewModeBadgeColor(dataset.default_review_mode)"
                >
                  {{ reviewModeLabel(dataset.default_review_mode) }}
                </UBadge>
                <span
                  v-else
                  class="text-muted"
                >{{ $t('status.na') }}</span>
              </dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">
                {{ $t('knowledge.datasets.form.attribution') }}
              </dt>
              <dd class="max-w-[60%] text-right text-sm">
                {{ dataset.attribution || '—' }}
              </dd>
            </div>
            <div
              v-if="dataset.source_url"
              class="flex flex-col gap-1"
            >
              <dt class="text-muted">
                {{ $t('knowledge.datasets.detail.sourceUrl') }}
              </dt>
              <dd>
                <a
                  :href="dataset.source_url"
                  class="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ dataset.source_url }}</a>
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold">
              {{ $t('knowledge.datasets.detail.reviewBreakdown') }}
            </h2>
          </template>
          <ul class="space-y-1 text-sm">
            <li>pending: {{ reviewCount('pending') }}</li>
            <li>approved: {{ reviewCount('approved') }}</li>
            <li>rejected: {{ reviewCount('rejected') }}</li>
            <li>draft: {{ reviewCount('draft') }}</li>
            <li>retired: {{ reviewCount('retired') }}</li>
          </ul>
        </UCard>
      </div>

      <KnowledgeDatasetChunksPanel
        class="mb-6"
        :dataset-id="datasetId"
        :dataset-code="dataset.code"
        :group-key="dataset.group_key"
      />

      <UCard v-if="canEdit">
        <template #header>
          <h2 class="text-sm font-semibold">
            {{ $t('knowledge.datasets.detail.editTitle') }}
          </h2>
        </template>
        <form
          class="grid max-w-xl gap-4"
          @submit.prevent="save"
        >
          <UFormField
            :label="$t('knowledge.datasets.form.code')"
            required
          >
            <UInput v-model="draftCode" />
          </UFormField>
          <UFormField
            :label="$t('knowledge.datasets.form.name')"
            required
          >
            <UInput v-model="draftName" />
          </UFormField>
          <UFormField :label="$t('knowledge.datasets.form.license')">
            <UInput v-model="draftLicense" />
          </UFormField>
          <UFormField :label="$t('knowledge.datasets.form.licenseUrl')">
            <UInput v-model="draftLicenseUrl" />
          </UFormField>
          <UFormField :label="$t('knowledge.datasets.form.attribution')">
            <UTextarea
              v-model="draftAttribution"
              :rows="3"
            />
          </UFormField>
          <UFormField :label="$t('knowledge.datasets.form.status')">
            <USelect
              v-model="draftStatus"
              :items="statusOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>
          <UFormField :label="$t('knowledge.datasets.form.reason')">
            <UInput
              v-model="draftReason"
              :placeholder="$t('knowledge.datasets.form.reasonHint')"
            />
          </UFormField>
          <div class="flex gap-2">
            <UButton
              type="submit"
              :loading="saving"
            >
              {{ $t('actions.save') }}
            </UButton>
          </div>
        </form>
      </UCard>
      <p
        v-else
        class="text-sm text-muted"
      >
        {{ $t('knowledge.datasets.readOnly') }}
      </p>
    </template>
  </PageHeader>
</template>
