<script setup lang="ts">
import type { KnowledgeAuditEvent } from '~/types/knowledge'
import { isKnowledgeResourceUuid } from '~/utils/knowledge-audit'

const props = defineProps<{
  items: KnowledgeAuditEvent[]
  showEntityLinks?: boolean
}>()

const localePath = useLocalePath()

function chunkAuditPath(row: KnowledgeAuditEvent): string | null {
  const id = row.chunk_id?.trim()
  if (id && isKnowledgeResourceUuid(id)) {
    return localePath(`/knowledge/audit/chunks/${id}`)
  }
  return null
}

function datasetAuditPath(row: KnowledgeAuditEvent): string | null {
  const id = row.dataset_id?.trim()
  if (id && isKnowledgeResourceUuid(id)) {
    return localePath(`/knowledge/audit/datasets/${id}`)
  }
  return null
}
</script>

<template>
  <AdminTable compact>
    <template #head>
      <tr>
        <th class="px-4 py-3 font-medium">
          {{ $t('knowledge.audit.columns.eventId') }}
        </th>
        <th class="px-4 py-3 font-medium">
          {{ $t('knowledge.audit.columns.time') }}
        </th>
        <th class="px-4 py-3 font-medium">
          {{ $t('knowledge.audit.columns.action') }}
        </th>
        <th class="px-4 py-3 font-medium">
          {{ $t('knowledge.audit.columns.source') }}
        </th>
        <th class="px-4 py-3 font-medium">
          {{ $t('knowledge.audit.columns.actor') }}
        </th>
        <th
          v-if="props.showEntityLinks"
          class="px-4 py-3 font-medium"
        >
          {{ $t('knowledge.audit.columns.related') }}
        </th>
      </tr>
    </template>
    <tr
      v-for="row in props.items"
      :key="`${row.id}-${row.created_at ?? ''}-${row.action ?? ''}`"
      class="border-b border-default last:border-0"
    >
      <td
        class="px-4 py-3 font-mono text-xs text-muted"
        :title="$t('knowledge.audit.eventIdHint')"
      >
        {{ row.id || '—' }}
      </td>
      <td class="px-4 py-3 whitespace-nowrap text-muted">
        {{ row.created_at || '—' }}
      </td>
      <td class="px-4 py-3 font-mono text-xs">
        {{ row.action || '—' }}
      </td>
      <td class="px-4 py-3 text-muted">
        {{ row.source || '—' }}<span v-if="row.level"> / {{ row.level }}</span>
      </td>
      <td class="px-4 py-3 font-mono text-xs">
        {{ row.actor_id || '—' }}
      </td>
      <td
        v-if="props.showEntityLinks"
        class="px-4 py-3 text-xs"
      >
        <NuxtLink
          v-if="chunkAuditPath(row)"
          :to="chunkAuditPath(row)!"
          class="text-primary underline"
        >
          {{ $t('knowledge.audit.linkChunk') }}
        </NuxtLink>
        <span
          v-if="chunkAuditPath(row) && datasetAuditPath(row)"
          class="text-muted"
        > · </span>
        <NuxtLink
          v-if="datasetAuditPath(row)"
          :to="datasetAuditPath(row)!"
          class="text-primary underline"
        >
          {{ $t('knowledge.audit.linkDataset') }}
        </NuxtLink>
        <span
          v-if="!chunkAuditPath(row) && !datasetAuditPath(row)"
          class="text-muted"
        >—</span>
      </td>
    </tr>
  </AdminTable>
</template>
