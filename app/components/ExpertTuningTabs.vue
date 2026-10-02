<script setup lang="ts">
import { normalizeAdminPath } from '~/utils/nav'

const localePath = useLocalePath()
const route = useRoute()

const tabs = [
  { key: 'weights', to: '/expert-tuning' },
  { key: 'training', to: '/expert-tuning/training' }
] as const

function active(to: string) {
  const current = normalizeAdminPath(route.path)
  if (to === '/expert-tuning') {
    return current === '/expert-tuning'
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
      {{ $t(`expertTuning.tabs.${tab.key}`) }}
    </UButton>
  </div>
</template>
