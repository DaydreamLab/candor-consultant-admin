<template>
  <UModal
    :open="open"
    :title="title || $t('actions.confirmTitle')"
    :description="description || $t('actions.confirmBody')"
    :ui="{ footer: 'justify-end gap-2' }"
    @update:open="emit('update:open', $event)"
  >
    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        size="md"
        @click="close"
      >
        {{ $t('actions.cancel') }}
      </UButton>
      <UButton
        :color="color"
        size="md"
        @click="emit('confirm')"
      >
        {{ confirmLabel || $t('actions.delete') }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  color?: 'error' | 'primary' | 'warning'
}>(), {
  title: '',
  description: '',
  confirmLabel: '',
  color: 'error'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()
</script>
