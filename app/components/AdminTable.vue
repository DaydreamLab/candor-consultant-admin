<template>
  <div class="overflow-x-auto rounded-xl border border-default bg-elevated">
    <table
      class="app-table w-full min-w-[52rem] text-left text-base"
      :class="[
        compact ? '' : 'min-w-[60rem]',
        fixed ? 'table-fixed' : ''
      ]"
    >
      <slot name="colgroup" />
      <thead class="border-b border-default bg-muted/40 text-sm text-muted">
        <slot name="head" />
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
    <p
      v-if="empty"
      class="px-4 py-10 text-center text-base text-muted"
    >
      {{ $t('table.empty') }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  empty?: boolean
  compact?: boolean
  fixed?: boolean
}>(), {
  compact: false,
  fixed: false
})
</script>
