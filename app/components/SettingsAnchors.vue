<script setup lang="ts">
import type { SettingsAnchorId } from '~/utils/settings-anchors'

defineProps<{
  items: SettingsAnchorId[]
  modelValue: SettingsAnchorId
}>()

const emit = defineEmits<{
  'update:modelValue': [SettingsAnchorId]
}>()

function labelKey(id: SettingsAnchorId) {
  return `settings.anchors.${id === 'cta-catalog' ? 'ctaCatalog' : id}`
}
</script>

<template>
  <nav
    class="flex shrink-0 flex-col gap-0.5 border-b border-default bg-elevated p-3 md:w-44 md:border-b-0 md:border-r"
    :aria-label="$t('settings.anchors.navLabel')"
    data-testid="settings-anchors"
  >
    <button
      v-for="id in items"
      :key="id"
      type="button"
      class="rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-brand-50 hover:text-brand-700"
      :class="modelValue === id ? 'bg-brand-50 font-semibold text-brand-700' : ''"
      :data-testid="`settings-anchor-${id}`"
      :aria-current="modelValue === id ? 'page' : undefined"
      @click="emit('update:modelValue', id)"
    >
      {{ $t(labelKey(id)) }}
    </button>
  </nav>
</template>
