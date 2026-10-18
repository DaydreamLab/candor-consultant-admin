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
  <div class="overflow-x-auto rounded-lg border border-default">
    <table class="min-w-full text-sm">
      <thead class="bg-muted/40 text-left text-muted">
        <tr>
          <th class="px-3 py-2 font-medium">
            {{ $t('knowledge.audit.columns.time') }}
          </th>
          <th class="px-3 py-2 font-medium">
            {{ $t('knowledge.audit.columns.action') }}
          </th>
          <th class="px-3 py-2 font-medium">
            {{ $t('knowledge.audit.columns.source') }}
          </th>
          <th class="px-3 py-2 font-medium">
            {{ $t('knowledge.audit.columns.actor') }}
          </th>
          <th
            v-if="props.showEntityLinks"
            class="px-3 py-2 font-medium"
          >
            {{ $t('knowledge.audit.columns.related') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in props.items"
          :key="`${row.id}-${row.created_at ?? ''}-${row.action ?? ''}`"
          class="border-t border-default"
        >
          <td class="px-3 py-2 whitespace-nowrap text-muted">
            {{ row.created_at || '—' }}
          </td>
          <td class="px-3 py-2 font-mono text-xs">
            {{ row.action || '—' }}
          </td>
          <td class="px-3 py-2 text-muted">
            {{ row.source || '—' }}<span v-if="row.level"> / {{ row.level }}</span>
          </td>
          <td class="px-3 py-2 font-mono text-xs">
            {{ row.actor_id || '—' }}
          </td>
          <td
            v-if="props.showEntityLinks"
            class="px-3 py-2 text-xs"
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
      </tbody>
    </table>
  </div>
</template>
