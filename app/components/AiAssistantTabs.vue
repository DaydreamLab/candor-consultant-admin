<script setup lang="ts">
import { normalizeAdminPath } from '~/utils/nav'

const localePath = useLocalePath()
const route = useRoute()

const tabs = [
  { key: 'copies', to: '/ai-assistant' },
  { key: 'site', to: '/ai-assistant/site' },
  { key: 'claimTerms', to: '/ai-assistant/claim-terms' }
] as const

function active(to: string) {
  const current = normalizeAdminPath(route.path)
  if (to === '/ai-assistant') {
    return current === '/ai-assistant'
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
      {{ $t(`aiAssistant.tabs.${tab.key}`) }}
    </UButton>
  </div>
</template>
