<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import {
  findActiveKnowledgeMoreTab,
  isKnowledgeTabActive,
  KNOWLEDGE_DAILY_TABS,
  KNOWLEDGE_MORE_TABS
} from '~/utils/knowledge-nav'

const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()

const moreOpen = ref(false)

const activeMoreTab = computed(() => findActiveKnowledgeMoreTab(route.path))
const moreActive = computed(() => Boolean(activeMoreTab.value))

const moreLabel = computed(() => {
  const tab = activeMoreTab.value
  if (!tab) {
    return t('knowledge.tabs.more')
  }
  return t('knowledge.tabs.moreWithPage', { name: t(`knowledge.tabs.${tab.key}`) })
})

type MoreMenuItem = DropdownMenuItem & { badge: string }

const moreItems = computed<MoreMenuItem[]>(() =>
  KNOWLEDGE_MORE_TABS.map((tab) => {
    const current = isKnowledgeTabActive(route.path, tab.to)
    return {
      label: t(`knowledge.tabs.${tab.key}`),
      to: localePath(tab.to),
      color: current ? 'primary' : undefined,
      class: current ? 'bg-primary/10' : undefined,
      badge: current ? t('knowledge.tabs.current') : t('knowledge.tabs.advanced'),
      onSelect: () => {
        moreOpen.value = false
      }
    }
  })
)

function dailyActive(to: string) {
  return isKnowledgeTabActive(route.path, to)
}
</script>

<template>
  <div
    class="mb-4 flex flex-nowrap items-center gap-2 overflow-x-auto"
    role="navigation"
    :aria-label="$t('knowledge.tabs.navLabel')"
  >
    <UButton
      v-for="tab in KNOWLEDGE_DAILY_TABS"
      :key="tab.key"
      :to="localePath(tab.to)"
      :color="dailyActive(tab.to) ? 'primary' : 'neutral'"
      :variant="dailyActive(tab.to) ? 'soft' : 'ghost'"
      size="sm"
      class="shrink-0"
    >
      {{ $t(`knowledge.tabs.${tab.key}`) }}
    </UButton>

    <UDropdownMenu
      v-model:open="moreOpen"
      :items="moreItems"
      :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
      :ui="{ content: 'min-w-44' }"
    >
      <UButton
        :label="moreLabel"
        :color="moreActive ? 'primary' : 'neutral'"
        :variant="moreActive ? (moreOpen ? 'solid' : 'soft') : 'outline'"
        :trailing-icon="moreOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        size="sm"
        class="shrink-0"
        aria-haspopup="menu"
        :aria-expanded="moreOpen"
      />

      <template #item-trailing="{ item }">
        <span class="text-xs text-muted">
          {{ (item as MoreMenuItem).badge }}
        </span>
      </template>
    </UDropdownMenu>
  </div>
</template>
