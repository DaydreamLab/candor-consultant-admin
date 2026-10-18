<script setup lang="ts">
import { AdminApiError, adminGetKnowledgeAuditDataset } from '~/utils/admin-api'
import type { KnowledgeAuditEvent } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { isKnowledgeResourceUuid } from '~/utils/knowledge-audit'

const config = useRuntimeConfig()
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()

const datasetId = computed(() => String(route.params.id ?? ''))
const items = ref<KnowledgeAuditEvent[]>([])
const pending = ref(true)
const errorMessage = ref('')
const filterAction = ref('')
const filterActor = ref('')

const idInvalid = computed(() => !isKnowledgeResourceUuid(datasetId.value))

async function load() {
  if (idInvalid.value) {
    items.value = []
    pending.value = false
    errorMessage.value = t('knowledge.audit.invalidDatasetId')
    return
  }
  const token = readOperatorToken()
  if (!token) {
    items.value = []
    pending.value = false
    errorMessage.value = t('knowledge.audit.failed')
    return
  }
  const id = datasetId.value
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await adminGetKnowledgeAuditDataset(config.public.apiBase, token, id, {
      action: filterAction.value.trim() || undefined,
      actor_id: filterActor.value.trim() || undefined,
      limit: 50
    })
    if (datasetId.value !== id) {
      return
    }
    items.value = response.items
  } catch (error) {
    if (datasetId.value !== id) {
      return
    }
    items.value = []
    if (error instanceof AdminApiError && error.statusCode === 403) {
      errorMessage.value = t('knowledge.audit.forbidden')
    } else {
      errorMessage.value = error instanceof AdminApiError && error.message
        ? error.message
        : t('knowledge.audit.failed')
    }
  } finally {
    if (datasetId.value === id) {
      pending.value = false
    }
  }
}

if (import.meta.client) {
  watch(datasetId, () => {
    void load()
  }, { immediate: true })
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.audit.datasetTitle')"
    :description="$t('knowledge.audit.datasetSubtitle')"
    plain
  >
    <KnowledgeTabs />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UButton
        :to="localePath('/knowledge/datasets/' + datasetId)"
        variant="ghost"
        size="sm"
      >
        {{ $t('knowledge.audit.backToDataset') }}
      </UButton>
      <UButton
        :to="localePath('/knowledge/audit')"
        variant="ghost"
        size="sm"
      >
        {{ $t('knowledge.audit.backToList') }}
      </UButton>
      <span class="font-mono text-xs text-muted">{{ datasetId }}</span>
    </div>

    <div
      v-if="!idInvalid"
      class="mb-4 flex flex-wrap items-end gap-3"
    >
      <UFormField
        :label="$t('knowledge.audit.filterAction')"
        class="w-56"
      >
        <UInput v-model="filterAction" />
      </UFormField>
      <UFormField
        :label="$t('knowledge.audit.filterActor')"
        class="w-56"
      >
        <UInput v-model="filterActor" />
      </UFormField>
      <UButton
        :loading="pending"
        @click="load"
      >
        {{ $t('knowledge.audit.refresh') }}
      </UButton>
    </div>

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.audit.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <EmptyPanel
      v-else-if="!items.length"
      :title="$t('knowledge.audit.emptyTitle')"
      :description="$t('knowledge.audit.empty')"
    />
    <KnowledgeAuditEventsTable
      v-else
      :items="items"
      :show-entity-links="true"
    />
  </PageHeader>
</template>
