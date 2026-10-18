<script setup lang="ts">
import { AdminApiError, adminListKnowledgeAudit } from '~/utils/admin-api'
import type { KnowledgeAuditEvent } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const { t } = useI18n()

const items = ref<KnowledgeAuditEvent[]>([])
const pending = ref(false)
const errorMessage = ref('')
const filterAction = ref('')
const filterActor = ref('')

async function load() {
  const token = readOperatorToken()
  if (!token) {
    items.value = []
    errorMessage.value = t('knowledge.audit.failed')
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await adminListKnowledgeAudit(config.public.apiBase, token, {
      action: filterAction.value.trim() || undefined,
      actor_id: filterActor.value.trim() || undefined,
      limit: 50
    })
    items.value = response.items
  } catch (error) {
    items.value = []
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.audit.failed')
  } finally {
    pending.value = false
  }
}

if (import.meta.client) {
  void load()
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.audit.title')"
    :description="$t('knowledge.audit.subtitle')"
  >
    <KnowledgeTabs />

    <div class="mb-4 flex flex-wrap items-end gap-3">
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
      show-entity-links
    />
  </PageHeader>
</template>
