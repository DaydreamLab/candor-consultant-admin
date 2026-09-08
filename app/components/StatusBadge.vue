<template>
  <UBadge
    variant="subtle"
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
