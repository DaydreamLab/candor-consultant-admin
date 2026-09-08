<template>
  <UModal
    :open="open"
    :title="$t('actions.confirmTitle')"
    :description="$t('actions.confirmBody')"
    :ui="{ footer: 'justify-end' }"
    @update:open="emit('update:open', $event)"
  >
    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        @click="close"
      >
        {{ $t('actions.cancel') }}
      </UButton>
      <UButton
        color="error"
        @click="emit('confirm')"
      >
        {{ $t('actions.delete') }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()
</script>
