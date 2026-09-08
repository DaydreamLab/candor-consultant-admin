<template>
  <UButton
    v-if="to"
    :to="to"
    color="primary"
    variant="soft"
    size="md"
    class="whitespace-nowrap"
    trailing-icon="i-lucide-arrow-right"
  >
    {{ label }}
  </UButton>
  <span
    v-else
    class="text-muted"
  >{{ $t('status.na') }}</span>
</template>

<script setup lang="ts">
defineProps<{
  to?: string
  label: string
}>()
</script>
