<script setup lang="ts">
import {
  AdminApiError,
  adminCreateKnowledgeDatasetGroup,
  adminListKnowledgeDatasetGroups
} from '~/utils/admin-api'
import type { KnowledgeDatasetGroup } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const { t } = useI18n()
const session = useSessionStore()

const rows = ref<KnowledgeDatasetGroup[]>([])
const pending = ref(true)
const errorMessage = ref('')
const saveError = ref('')
const saving = ref(false)
const createOpen = ref(false)
const draftKey = ref('')
const draftName = ref('')
const draftReason = ref('')
const draftSort = ref<number | null>(null)

const canCreate = computed(() => session.operator?.role === 'admin')

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    rows.value = []
    errorMessage.value = t('knowledge.datasetGroups.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    rows.value = await adminListKnowledgeDatasetGroups(config.public.apiBase, token)
  } catch (error) {
    rows.value = []
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.datasetGroups.failed')
  } finally {
    pending.value = false
  }
}

function openCreate() {
  draftKey.value = ''
  draftName.value = ''
  draftReason.value = ''
  draftSort.value = null
  saveError.value = ''
  createOpen.value = true
}

async function submitCreate() {
  const token = readOperatorToken()
  if (!token || !canCreate.value || saving.value) {
    return
  }
  const group_key = draftKey.value.trim()
  const display_name = draftName.value.trim()
  const reason = draftReason.value.trim()
  if (!group_key || !display_name || !reason) {
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    const created = await adminCreateKnowledgeDatasetGroup(config.public.apiBase, token, {
      group_key,
      display_name,
      reason,
      sort_order: draftSort.value ?? undefined
    })
    rows.value = [...rows.value, created].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    createOpen.value = false
  } catch (error) {
    saveError.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.datasetGroups.createFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.datasetGroups.title')"
    :description="$t('knowledge.datasetGroups.subtitle')"
    plain
  >
    <KnowledgeTabs />

    <div
      v-if="canCreate"
      class="mb-4"
    >
      <UButton @click="openCreate">
        {{ $t('knowledge.datasetGroups.create') }}
      </UButton>
    </div>

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.datasetGroups.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <EmptyPanel
      v-else-if="!rows.length"
      :title="$t('knowledge.datasetGroups.emptyTitle')"
      :description="$t('knowledge.datasetGroups.empty')"
    />
    <AdminTable
      v-else
      compact
    >
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasetGroups.columns.key') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasetGroups.columns.name') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasetGroups.columns.datasets') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('knowledge.datasetGroups.columns.sort') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.group_key"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-mono text-xs">
          {{ row.group_key }}
        </td>
        <td class="px-4 py-3">
          {{ row.display_name }}
        </td>
        <td class="px-4 py-3">
          {{ row.dataset_count ?? '—' }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.sort_order ?? '—' }}
        </td>
      </tr>
    </AdminTable>

    <UModal v-model:open="createOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-base font-semibold">
              {{ $t('knowledge.datasetGroups.createTitle') }}
            </h3>
          </template>
          <div class="grid gap-3">
            <UFormField
              :label="$t('knowledge.datasetGroups.form.key')"
              required
            >
              <UInput v-model="draftKey" />
            </UFormField>
            <UFormField
              :label="$t('knowledge.datasetGroups.form.name')"
              required
            >
              <UInput v-model="draftName" />
            </UFormField>
            <UFormField
              :label="$t('knowledge.datasetGroups.form.reason')"
              required
            >
              <UTextarea
                v-model="draftReason"
                :rows="3"
              />
            </UFormField>
            <UFormField :label="$t('knowledge.datasetGroups.form.sort')">
              <UInput
                v-model.number="draftSort"
                type="number"
              />
            </UFormField>
            <p
              v-if="saveError"
              class="text-sm text-error"
            >
              {{ saveError }}
            </p>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                @click="createOpen = false"
              >
                {{ $t('actions.cancel') }}
              </UButton>
              <UButton
                :loading="saving"
                :disabled="!draftKey.trim() || !draftName.trim() || !draftReason.trim()"
                @click="submitCreate"
              >
                {{ $t('knowledge.datasetGroups.createConfirm') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </PageHeader>
</template>
