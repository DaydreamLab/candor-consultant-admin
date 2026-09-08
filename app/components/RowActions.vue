<template>
  <div class="flex justify-end gap-1.5">
    <UButton
      v-if="edit"
      size="md"
      color="neutral"
      variant="ghost"
      icon="i-lucide-pencil"
      :disabled="disabled"
      :aria-label="$t('actions.edit')"
      @click.stop="emit('edit')"
    />
    <UButton
      v-if="remove"
      size="md"
      color="error"
      variant="ghost"
      icon="i-lucide-trash"
      :disabled="disabled"
      :aria-label="$t('actions.delete')"
      @click.stop="emit('remove')"
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
