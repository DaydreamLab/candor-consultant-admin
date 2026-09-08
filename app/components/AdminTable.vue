<template>
  <div class="overflow-x-auto rounded-xl border border-default bg-elevated">
    <table class="w-full min-w-[880px] text-left text-sm">
      <thead class="border-b border-default bg-muted/40 text-xs text-muted">
        <slot name="head" />
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
    <p
      v-if="empty"
      class="px-4 py-8 text-center text-sm text-muted"
    >
      {{ $t('table.empty') }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  empty?: boolean
}>()
</script>
