<template>
  <div class="flex justify-end gap-1">
    <UButton
      v-if="edit"
      size="xs"
      color="neutral"
      variant="ghost"
      icon="i-lucide-pencil"
      :disabled="disabled"
      :aria-label="$t('actions.edit')"
      @click="emit('edit')"
    />
    <UButton
      v-if="remove"
      size="xs"
      color="error"
      variant="ghost"
      icon="i-lucide-trash"
      :disabled="disabled"
      :aria-label="$t('actions.delete')"
      @click="emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  disabled?: boolean
  edit?: boolean
  remove?: boolean
}>(), {
  disabled: false,
  edit: true,
  remove: true
})

const emit = defineEmits<{
  edit: []
  remove: []
}>()
</script>
