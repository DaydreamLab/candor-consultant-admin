<template>
  <UBadge
    variant="subtle"
    class="whitespace-nowrap"
    :color="color"
  >
    {{ label }}
  </UBadge>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
}>()
</script>
