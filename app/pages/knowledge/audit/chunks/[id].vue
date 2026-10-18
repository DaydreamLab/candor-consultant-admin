<script setup lang="ts">
import { AdminApiError, adminGetKnowledgeAuditChunk } from '~/utils/admin-api'
import type { KnowledgeAuditEvent } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { isKnowledgeResourceUuid } from '~/utils/knowledge-audit'

const config = useRuntimeConfig()
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()

const chunkId = computed(() => String(route.params.id ?? ''))
const items = ref<KnowledgeAuditEvent[]>([])
const pending = ref(true)
const errorMessage = ref('')
const limit = ref(50)

const idInvalid = computed(() => !isKnowledgeResourceUuid(chunkId.value))

async function load() {
  if (idInvalid.value) {
    items.value = []
    pending.value = false
    errorMessage.value = t('knowledge.audit.invalidChunkId')
    return
  }
  const token = readOperatorToken()
  if (!token) {
    items.value = []
    pending.value = false
    errorMessage.value = t('knowledge.audit.failed')
    return
  }
  const id = chunkId.value
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await adminGetKnowledgeAuditChunk(config.public.apiBase, token, id, {
      limit: limit.value
    })
    if (chunkId.value !== id) {
      return
    }
    items.value = response.items
  } catch (error) {
    if (chunkId.value !== id) {
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
    if (chunkId.value === id) {
      pending.value = false
    }
  }
}

if (import.meta.client) {
  watch(chunkId, () => {
    void load()
  }, { immediate: true })
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.audit.chunkTitle')"
    :description="$t('knowledge.audit.chunkSubtitle')"
    plain
  >
    <KnowledgeTabs />

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UButton
        :to="localePath('/knowledge/audit')"
        variant="ghost"
        size="sm"
      >
        {{ $t('knowledge.audit.backToList') }}
      </UButton>
      <span class="font-mono text-xs text-muted">{{ chunkId }}</span>
      <UButton
        v-if="!idInvalid"
        size="sm"
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
      :show-entity-links="false"
    />
  </PageHeader>
</template>
