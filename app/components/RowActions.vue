<template>
  <div class="flex flex-wrap items-center justify-end gap-2">
    <UButton
      v-if="edit"
      size="md"
      color="neutral"
      variant="outline"
      icon="i-lucide-pencil"
      :disabled="disabled"
      @click.stop="emit('edit')"
    >
      {{ $t('actions.edit') }}
    </UButton>
    <UButton
      v-if="remove"
      size="md"
      color="error"
      variant="ghost"
      icon="i-lucide-trash"
      :disabled="disabled"
      @click.stop="emit('remove')"
    >
      {{ $t('actions.delete') }}
    </UButton>
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
