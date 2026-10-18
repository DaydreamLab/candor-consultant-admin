<script setup lang="ts">
import { normalizeAdminPath } from '~/utils/nav'

const localePath = useLocalePath()
const route = useRoute()

const tabs = [
  { key: 'datasets', to: '/knowledge/datasets' },
  { key: 'chunks', to: '/knowledge/chunks' },
  { key: 'retrievalPreview', to: '/knowledge/retrieval-preview' },
  { key: 'audit', to: '/knowledge/audit' }
] as const

function active(to: string) {
  const current = normalizeAdminPath(route.path)
  if (to === '/knowledge/datasets') {
    return current === '/knowledge/datasets' || current.startsWith('/knowledge/datasets/')
  }
  return current === to || current.startsWith(`${to}/`)
}
</script>

<template>
  <div class="mb-4 flex flex-wrap gap-2">
    <UButton
      v-for="tab in tabs"
      :key="tab.key"
      :to="localePath(tab.to)"
      :color="active(tab.to) ? 'primary' : 'neutral'"
      :variant="active(tab.to) ? 'soft' : 'ghost'"
      size="sm"
    >
      {{ $t(`knowledge.tabs.${tab.key}`) }}
    </UButton>
  </div>
</template>
