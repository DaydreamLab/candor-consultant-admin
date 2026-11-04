<script setup lang="ts">
import { normalizeAdminPath } from '~/utils/nav'

const localePath = useLocalePath()
const route = useRoute()

const tabs = [
  { key: 'weights', to: '/weights' },
  { key: 'dailyLearning', to: '/weights/daily-learning' },
  { key: 'training', to: '/weights/training' }
] as const

function active(to: string) {
  const current = normalizeAdminPath(route.path)
  if (to === '/weights') {
    return current === '/weights'
      || (current.startsWith('/weights/')
        && !current.startsWith('/weights/daily-learning')
        && !current.startsWith('/weights/training'))
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
      {{ $t(`weights.tabs.${tab.key}`) }}
    </UButton>
  </div>
</template>
