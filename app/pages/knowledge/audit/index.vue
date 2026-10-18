<script setup lang="ts">
import { AdminApiError, adminListKnowledgeAudit } from '~/utils/admin-api'
import type { KnowledgeAuditEvent } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'

const PAGE_SIZE = 50

const config = useRuntimeConfig()
const { t } = useI18n()

const items = ref<KnowledgeAuditEvent[]>([])
const pending = ref(false)
const errorMessage = ref('')
const filterAction = ref('')
const filterActor = ref('')
const offset = ref(0)
const hasMore = ref(false)

async function load(reset: boolean) {
  const token = readOperatorToken()
  if (!token) {
    items.value = []
    errorMessage.value = t('knowledge.audit.failed')
    return
  }
  if (reset) {
    offset.value = 0
    items.value = []
  }
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await adminListKnowledgeAudit(config.public.apiBase, token, {
      action: filterAction.value.trim() || undefined,
      actor_id: filterActor.value.trim() || undefined,
      limit: PAGE_SIZE,
      offset: offset.value
    })
    const batch = response.items
    items.value = reset ? batch : [...items.value, ...batch]
    hasMore.value = batch.length >= PAGE_SIZE
    offset.value += batch.length
  } catch (error) {
    if (reset) {
      items.value = []
    }
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.audit.failed')
  } finally {
    pending.value = false
  }
}

function refresh() {
  void load(true)
}

function loadMore() {
  if (pending.value || !hasMore.value) {
    return
  }
  void load(false)
}

if (import.meta.client) {
  void load(true)
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.audit.title')"
    :description="$t('knowledge.audit.subtitle')"
    plain
  >
    <KnowledgeTabs />

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div class="min-w-52">
        <label class="mb-1 block text-xs text-muted">
          {{ $t('knowledge.audit.filterAction') }}
        </label>
        <UInput
          v-model="filterAction"
          class="w-full"
        />
      </div>
      <div class="min-w-52">
        <label class="mb-1 block text-xs text-muted">
          {{ $t('knowledge.audit.filterActor') }}
        </label>
        <UInput
          v-model="filterActor"
          class="w-full"
        />
      </div>
      <UButton
        :loading="pending && !items.length"
        @click="refresh"
      >
        {{ $t('knowledge.audit.refresh') }}
      </UButton>
    </div>

    <p
      v-if="pending && !items.length"
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
    <template v-else>
      <KnowledgeAuditEventsTable
        :items="items"
        show-entity-links
      />
      <div
        v-if="hasMore"
        class="mt-4 flex justify-center"
      >
        <UButton
          variant="outline"
          :loading="pending"
          @click="loadMore"
        >
          {{ $t('knowledge.audit.loadMore') }}
        </UButton>
      </div>
    </template>
  </PageHeader>
</template>
