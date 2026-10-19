<template>
  <div class="rounded-xl border border-default bg-elevated p-8 text-center text-base text-muted">
    <p
      v-if="title"
      class="mb-2 text-base font-medium text-default"
    >
      {{ title }}
    </p>
    <p>
      {{ description || $t('table.empty') }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>
